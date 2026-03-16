import json
import logging
import sys

import anthropic

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent / "backend"))
from database import CATEGORIES

from . import config

logger = logging.getLogger("oscar_bot")

SYSTEM_PROMPT = """You are an Oscar ceremony winner extraction bot. You read live blog text and identify ONLY officially announced Oscar winners.

FALSE POSITIVES ARE CATASTROPHIC. When in doubt, report nothing.

## STEP 1: For each potential winner, you MUST find a "proof sentence"

A proof sentence is a direct, past-tense or present-announcement statement that someone WON. It must contain language like:
  - "And the Oscar goes to [NAME]"
  - "[NAME] wins Best [Category]"  
  - "[NAME] has won the Oscar for [Category]"
  - "Winner: [NAME]"
  - "The award for [Category] goes to [NAME]"

If you cannot identify a single specific sentence that unambiguously announces the winner, DO NOT report it.

## STEP 2: Verify it is NOT one of these false positive patterns

NONE of these are winner announcements, even if they sound confident:
  - PREDICTIONS: "expected to win", "should win", "is the frontrunner", "will likely take", "is favored", "has this locked up", "our pick is", "we think X wins"
  - PERFORMANCES: A song being performed or sung on stage does NOT mean it won Best Original Song. A clip being shown does NOT mean it won.
  - PRESENTER INTROS: "X takes the stage to present Best Y" is NOT X winning.
  - NOMINEE LISTS: A list of all nominees in a category is NOT a winner announcement, even if one name appears bold or first.
  - PAST TENSE RECAPS OF PRIOR YEARS: "X won the Oscar in 2024" is not a 2026 winner.
  - CONDITIONAL/SPECULATIVE: "If X wins...", "When X wins...", "X could win"
  - AUDIENCE REACTIONS without explicit win language: "Standing ovation for X" is NOT a win.

## STEP 3: Match to the exact category

The source text must specify or clearly imply the EXACT category. Similar categories are DIFFERENT awards:
  - "Best Actor" ≠ "Best Supporting Actor"  
  - "Best Adapted Screenplay" ≠ "Best Original Screenplay"
  - "Best Original Score" ≠ "Best Original Song"

If the text just says someone "won an Oscar" without specifying which one, SKIP IT.

## STEP 4: Match the winner string VERBATIM

Return the nominee string exactly as provided in the nominee list, character for character, including accented characters (é, ā), em dashes, and quoted titles.

## OUTPUT FORMAT

Return ONLY valid JSON. For each winner, include:
{
  "winners": [
    {
      "category": "exact category name",
      "winner": "exact nominee string from provided list",
      "proof": "the exact sentence from the source that confirms the win"
    }
  ]
}

If no winners are confirmed, return: {"winners": []}

The "proof" field is mandatory. If you cannot fill it with a real, unambiguous sentence from the text, do not include that winner.

IMPORTANT: Do NOT explain your reasoning. Do NOT output any text before or after the JSON. Return ONLY the JSON object, nothing else."""


def _build_categories_text(already_announced: set[str]) -> str:
    lines = []
    for cat in CATEGORIES:
        if cat["name"] in already_announced:
            continue
        nominees_str = "\n".join(f"  - {n}" for n in cat["nominees"])
        lines.append(f"{cat['name']}:\n{nominees_str}")
    return "\n\n".join(lines)


def _normalize(s: str) -> str:
    """Lowercase, strip punctuation/quotes, collapse whitespace."""
    import re
    s = s.lower().replace("\u2014", " ").replace("—", " ").replace(",", " ")
    s = re.sub(r'["\'\u201c\u201d\u2018\u2019]', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def _fuzzy_match_nominee(returned: str, nominees: set[str]) -> str | None:
    """Try to match Claude's returned string to an actual nominee."""
    norm_returned = _normalize(returned)
    for nominee in nominees:
        norm_nominee = _normalize(nominee)
        # Check if one contains the other, or if the name portion matches
        if norm_returned == norm_nominee:
            return nominee
        if norm_returned in norm_nominee or norm_nominee in norm_returned:
            return nominee
        # Match just the person's name (before the dash)
        name_part = norm_nominee.split("  ")[0].strip()  # double space from em-dash replacement
        if name_part and name_part in norm_returned:
            return nominee
    return None


async def extract_winners(
    scraped_text: str,
    already_announced: set[str],
) -> list[dict]:
    if not scraped_text.strip():
        return []

    categories_text = _build_categories_text(already_announced)
    if not categories_text:
        logger.info("All categories announced — nothing to extract")
        return []

    user_prompt = f"""Here are the Oscar categories still awaiting winners, with their exact nominee strings. You MUST return these strings exactly as shown:

{categories_text}

Here is the latest text from live coverage of the Oscar ceremony:

---
{scraped_text}
---

Follow the steps in your instructions. Return JSON in this format:
{{"winners": [{{"category": "exact category name", "winner": "exact nominee string from the list above", "proof": "the exact sentence from the source that confirms this win"}}]}}

If no winners are confirmed, return: {{"winners": []}}"""

    client = anthropic.AsyncAnthropic(api_key=config.ANTHROPIC_API_KEY)

    try:
        response = await client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw_text = response.content[0].text.strip()

        # Parse JSON from response (handle markdown code blocks)
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        # Try to extract JSON object or array
        if not raw_text.startswith(("{", "[")):
            import re
            match = re.search(r'[\{\[].*[\}\]]', raw_text, re.DOTALL)
            if match:
                raw_text = match.group(0)

        parsed = json.loads(raw_text)

        # Handle both {"winners": [...]} and bare [...] formats
        if isinstance(parsed, dict):
            results = parsed.get("winners", [])
        elif isinstance(parsed, list):
            results = parsed
        else:
            logger.error(f"Claude returned unexpected type: {type(parsed)}")
            return []

        # Validate each result against CATEGORIES
        validated = []
        category_names = {cat["name"] for cat in CATEGORIES}
        nominees_by_cat = {cat["name"]: set(cat["nominees"]) for cat in CATEGORIES}

        # Build a map of confusable category pairs for cross-validation
        _confusable_pairs = {
            "Best Actor": "Best Supporting Actor",
            "Best Supporting Actor": "Best Actor",
            "Best Actress": "Best Supporting Actress",
            "Best Supporting Actress": "Best Actress",
            "Best Adapted Screenplay": "Best Original Screenplay",
            "Best Original Screenplay": "Best Adapted Screenplay",
            "Best Original Score": "Best Original Song",
            "Best Original Song": "Best Original Score",
        }

        for r in results:
            cat = r.get("category", "")
            winner = r.get("winner", "")
            quote = r.get("proof", "") or r.get("source_quote", "")

            if cat not in category_names:
                logger.warning(f"Claude returned unknown category: '{cat}'")
                continue
            if cat in already_announced:
                logger.debug(f"Skipping already-announced category: '{cat}'")
                continue
            if winner not in nominees_by_cat.get(cat, set()):
                # Fuzzy match: try to find the nominee by name
                matched = _fuzzy_match_nominee(winner, nominees_by_cat.get(cat, set()))
                if matched:
                    logger.info(f"Fuzzy matched '{winner}' -> '{matched}' for '{cat}'")
                    winner = matched
                else:
                    # Cross-category check: did Claude assign the winner to the wrong similar category?
                    sibling = _confusable_pairs.get(cat)
                    if sibling and sibling not in already_announced:
                        sibling_match = _fuzzy_match_nominee(winner, nominees_by_cat.get(sibling, set()))
                        if sibling_match:
                            logger.warning(
                                f"CATEGORY MIX-UP: '{winner}' is not a '{cat}' nominee "
                                f"but matches '{sibling}' nominee '{sibling_match}'. "
                                f"Rejecting — source text likely refers to '{sibling}', not '{cat}'."
                            )
                            continue
                    logger.warning(f"Claude returned invalid nominee '{winner}' for '{cat}'")
                    continue

            validated.append({
                "category": cat,
                "winner": winner,
                "source_quote": quote,
            })

        if validated:
            logger.info(f"Claude found {len(validated)} winner(s)!")
        else:
            logger.info("Claude: no new winners")
        return validated

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response as JSON: {e}")
        logger.warning(f"Raw Claude response: {raw_text[:500]}")
        return []
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        raise
