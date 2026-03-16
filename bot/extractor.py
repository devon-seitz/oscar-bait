import json
import logging
import sys

import anthropic

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent / "backend"))
from database import CATEGORIES

from . import config

logger = logging.getLogger("oscar_bot")

SYSTEM_PROMPT = """You are an Oscar ceremony winner extraction bot. Your job is to read live blog text and identify any Oscar winners that have been officially announced.

RULES:
1. Only report a winner if the text CLEARLY states they won. Phrases like "And the Oscar goes to...", "Winner:", "[Category] won by", or explicit statements that someone has won count. Predictions, speculation, "expected to win", "should win", or "frontrunner" do NOT count.
2. You must match winners to EXACTLY one of the provided nominee strings. Return the nominee string VERBATIM — character for character, including accented characters (é, ā), em-dashes (—), and quoted titles. Do NOT paraphrase, abbreviate, or modify the strings in any way.
3. If you are not confident a winner has been officially announced, do not include it. It is better to miss a winner than to report a false one.
4. Return valid JSON only, no other text."""


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

Extract any newly announced winners. Return a JSON array of objects:
[{{"category": "exact category name", "winner": "exact nominee string", "confidence": "high", "source_quote": "the exact text that confirms this"}}]

Set confidence to "high" only if the text explicitly confirms a win. Set to "medium" if the text strongly implies it but isn't explicit.

If no new winners are found, return an empty array: []"""

    client = anthropic.AsyncAnthropic(api_key=config.ANTHROPIC_API_KEY)

    try:
        response = await client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw_text = response.content[0].text.strip()

        # Parse JSON from response (handle markdown code blocks)
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        # Try to extract JSON array if Claude wrapped it in text
        if not raw_text.startswith("["):
            import re
            match = re.search(r'\[.*\]', raw_text, re.DOTALL)
            if match:
                raw_text = match.group(0)

        results = json.loads(raw_text)

        if not isinstance(results, list):
            logger.error(f"Claude returned non-list: {type(results)}")
            return []

        # Validate each result against CATEGORIES
        validated = []
        category_names = {cat["name"] for cat in CATEGORIES}
        nominees_by_cat = {cat["name"]: set(cat["nominees"]) for cat in CATEGORIES}

        for r in results:
            cat = r.get("category", "")
            winner = r.get("winner", "")
            confidence = r.get("confidence", "medium")
            quote = r.get("source_quote", "")

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
                    logger.warning(f"Claude returned invalid nominee '{winner}' for '{cat}'")
                    continue

            # Filter by minimum confidence
            if config.MIN_CONFIDENCE == "high" and confidence != "high":
                logger.info(f"Skipping '{cat}' — confidence is '{confidence}', need 'high'")
                continue

            validated.append({
                "category": cat,
                "winner": winner,
                "confidence": confidence,
                "source_quote": quote,
            })

        logger.info(f"Extracted {len(validated)} valid winner(s) from Claude response")
        return validated

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response as JSON: {e}")
        logger.warning(f"Raw Claude response: {raw_text[:500]}")
        return []
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        raise
