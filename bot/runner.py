import asyncio
import logging
import sys

from . import config
from .announcer import announce_winner, fetch_announced_winners
from .extractor import extract_winners
from .scraper import scrape_all_sources
from .state import BotState

logger = logging.getLogger("oscar_bot")

CIRCUIT_BREAKER_THRESHOLD = 3
CIRCUIT_BREAKER_PAUSE = 300  # 5 minutes


def setup_logging():
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL),
        format="%(asctime)s %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )
    # Silence noisy HTTP request logging from httpx/httpcore
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


async def confirm_with_user(category: str, winner: str, quote: str) -> bool:
    print(f"\n{'='*60}")
    print(f"  WINNER DETECTED")
    print(f"  Category: {category}")
    print(f"  Winner:   {winner}")
    print(f"  Quote:    {quote}")
    print(f"{'='*60}")

    while True:
        answer = input("Announce this winner? [y/n/q] ").strip().lower()
        if answer == "y":
            return True
        elif answer == "n":
            print("Skipped.")
            return False
        elif answer == "q":
            print("Quitting bot.")
            sys.exit(0)
        else:
            print("Enter y (yes), n (no), or q (quit)")


async def run_poll_cycle(state: BotState) -> int:
    """Run one poll cycle. Returns number of winners announced."""
    import hashlib

    # Scrape sources
    scraped_text = await scrape_all_sources(config.SOURCES)
    if not scraped_text:
        logger.info("No text from any source — skipping cycle")
        return 0

    # Skip Claude call if scraped content hasn't changed
    content_hash = hashlib.md5(scraped_text.encode()).hexdigest()
    if content_hash == state.last_content_hash:
        logger.info("Scraped content unchanged — skipping Claude call")
        return 0
    state.last_content_hash = content_hash

    # Extract winners via Claude
    try:
        winners = await extract_winners(scraped_text, state.announced)
        state.clear_errors()
    except Exception as e:
        error_count = state.record_error()
        logger.error(f"Extraction error ({error_count}/{CIRCUIT_BREAKER_THRESHOLD}): {e}")
        if error_count >= CIRCUIT_BREAKER_THRESHOLD:
            logger.warning(f"Circuit breaker triggered — pausing {CIRCUIT_BREAKER_PAUSE}s")
            await asyncio.sleep(CIRCUIT_BREAKER_PAUSE)
            state.clear_errors()
        return 0

    if not winners:
        return 0

    announced_count = 0
    for w in winners:
        category = w["category"]
        winner = w["winner"]
        confidence = w["confidence"]
        quote = w["source_quote"]

        if state.is_announced(category):
            continue

        state.log_action("winner_detected", {
            "category": category,
            "winner": winner,
            "confidence": confidence,
            "source_quote": quote,
        })

        # Confirm mode: ask user before announcing
        if config.BOT_MODE == "confirm":
            if not await confirm_with_user(category, winner, quote):
                state.log_action("winner_skipped", {"category": category, "winner": winner})
                continue

        # Announce via API
        success = await announce_winner(
            config.OSCAR_API_URL, config.ADMIN_PASSCODE, category, winner
        )

        if success:
            state.mark_announced(category)
            state.log_action("winner_announced", {"category": category, "winner": winner})
            announced_count += 1
            print(f"  ✓ {category}: {winner}")
        else:
            state.log_action("announce_failed", {"category": category, "winner": winner})
            logger.error(f"Failed to announce {category}: {winner}")

    return announced_count


async def main():
    setup_logging()
    config.validate()

    print("=" * 60)
    print("  Oscar Bot — Automated Winner Announcer")
    print(f"  Mode: {config.BOT_MODE}")
    print(f"  API:  {config.OSCAR_API_URL}")
    print(f"  Poll interval: {config.POLL_INTERVAL}s")
    print(f"  Sources: {', '.join(s['name'] for s in config.SOURCES)}")
    print("=" * 60)

    state = BotState()

    # Seed state from already-announced winners
    try:
        already = await fetch_announced_winners(config.OSCAR_API_URL)
        for cat in already:
            state.mark_announced(cat)
        if already:
            print(f"\n  {len(already)} categories already announced — skipping those")
    except Exception as e:
        logger.warning(f"Could not fetch existing winners: {e}")

    print(f"\n  Watching for winners in {19 - len(state.announced)} remaining categories...\n")

    # Main polling loop
    while not state.all_announced():
        try:
            count = await run_poll_cycle(state)
            if count:
                remaining = 19 - len(state.announced)
                print(f"  → {remaining} categories remaining\n")
        except KeyboardInterrupt:
            print("\nBot stopped by user.")
            break
        except Exception as e:
            logger.error(f"Unexpected error in poll cycle: {e}")

        await asyncio.sleep(config.POLL_INTERVAL)

    if state.all_announced():
        print("\n" + "=" * 60)
        print("  All 19 categories announced! Bot complete.")
        print("=" * 60)

    # Print action log summary
    announcements = [a for a in state.action_log if a["action"] == "winner_announced"]
    if announcements:
        print(f"\n  Total announcements made by bot: {len(announcements)}")


if __name__ == "__main__":
    asyncio.run(main())
