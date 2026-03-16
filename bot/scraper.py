import logging

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("oscar_bot")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
}

MAX_ENTRIES = 50  # Grab more entries to capture winners deeper in the page

# Reuse a single client across all fetches to keep connections alive
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=15, follow_redirects=True, headers=HEADERS)
    return _client


async def fetch_source(source: dict) -> str | None:
    name = source["name"]
    url = source["url"]
    selector = source["selector"]

    try:
        client = _get_client()
        resp = await client.get(url)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        elements = soup.select(selector)

        if not elements:
            # Fallback: grab all <p> tags from the page body
            elements = soup.select("main p, article p, .content p, main li, article li, .content li, main h3, article h3")

        # Take the most recent entries (live blogs are typically newest-first)
        entries = elements[:MAX_ENTRIES]
        text = "\n\n".join(el.get_text(strip=True) for el in entries if el.get_text(strip=True))

        if not text:
            logger.warning(f"[{name}] Fetched page but extracted no text")
            return None

        logger.debug(f"[{name}] Scraped {len(entries)} entries ({len(text)} chars)")
        return f"--- Source: {name} ---\n{text}"

    except httpx.HTTPStatusError as e:
        logger.warning(f"[{name}] HTTP {e.response.status_code} from {url}")
        return None
    except httpx.RequestError as e:
        logger.warning(f"[{name}] Request failed: {e}")
        return None
    except Exception as e:
        logger.warning(f"[{name}] Unexpected error: {e}")
        return None


async def scrape_all_sources(sources: list[dict]) -> str:
    import asyncio

    results = await asyncio.gather(*(fetch_source(s) for s in sources))
    texts = [r for r in results if r]

    if not texts:
        logger.warning("Scrape: 0/{len(sources)} sources returned text")
        return ""

    failed = [s["name"] for s, r in zip(sources, results) if r is None]
    if failed:
        logger.info(f"Scraped {len(texts)}/{len(sources)} sources (failed: {', '.join(failed)})")
    else:
        logger.info(f"Scraped {len(texts)}/{len(sources)} sources ✓")
    return "\n\n".join(texts)
