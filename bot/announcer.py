import logging
import sys

import httpx

# Import CATEGORIES from the backend
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent / "backend"))
from database import CATEGORIES

logger = logging.getLogger("oscar_bot")

# Build lookup structures for validation
CATEGORY_NAMES = {cat["name"] for cat in CATEGORIES}
NOMINEES_BY_CATEGORY = {cat["name"]: set(cat["nominees"]) for cat in CATEGORIES}


def validate_winner(category: str, winner: str) -> bool:
    if category not in CATEGORY_NAMES:
        logger.error(f"Invalid category: '{category}'")
        return False
    if winner not in NOMINEES_BY_CATEGORY[category]:
        logger.error(f"Invalid nominee '{winner}' for category '{category}'")
        return False
    return True


async def announce_winner(api_url: str, passcode: str, category: str, winner: str) -> bool:
    if not validate_winner(category, winner):
        return False

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{api_url}/api/admin/winner",
            json={"category": category, "winner": winner, "passcode": passcode},
        )
        if resp.status_code == 200:
            logger.info(f"Announced winner: {category} -> {winner}")
            return True
        else:
            logger.error(f"Failed to announce ({resp.status_code}): {resp.text}")
            return False


async def fetch_announced_winners(api_url: str) -> set[str]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{api_url}/api/categories")
        resp.raise_for_status()
        categories = resp.json()
        return {cat["name"] for cat in categories if cat.get("winner")}
