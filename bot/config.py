import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the project root (oscar-bait/)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


OSCAR_API_URL = os.environ.get("OSCAR_API_URL", "http://localhost:8000")
ADMIN_PASSCODE = os.environ.get("ADMIN_PASSCODE", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
BOT_MODE = os.environ.get("BOT_MODE", "auto")  # "auto" or "confirm"
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "15"))
MIN_CONFIDENCE = os.environ.get("MIN_CONFIDENCE", "high")  # "high" or "medium"
LOG_LEVEL = os.environ.get("BOT_LOG_LEVEL", "INFO")

CLAUDE_MODEL = "claude-sonnet-4-20250514"

# Live blog sources — update URLs on ceremony night
SOURCES = [
    {
        "name": "AP News",
        "url": os.environ.get("SOURCE_AP_URL", "https://apnews.com/live/oscars-2026"),
        "selector": "div[data-key] .RichTextStoryBody, div[data-key] p",
    },
    {
        "name": "Deadline",
        "url": os.environ.get("SOURCE_DEADLINE_URL", "https://deadline.com/oscars-live-blog-2026/"),
        "selector": ".entry-content p, .liveblog-entry p",
    },
    {
        "name": "Variety",
        "url": os.environ.get("SOURCE_VARIETY_URL", "https://variety.com/live/oscars-2026-live-blog/"),
        "selector": ".c-liveblog__entry p, .entry-content p",
    },
]


def validate():
    errors = []
    if not ADMIN_PASSCODE:
        errors.append("ADMIN_PASSCODE is required")
    if not ANTHROPIC_API_KEY:
        errors.append("ANTHROPIC_API_KEY is required")
    if BOT_MODE not in ("auto", "confirm"):
        errors.append(f"BOT_MODE must be 'auto' or 'confirm', got '{BOT_MODE}'")
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
