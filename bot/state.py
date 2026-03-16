import logging
from datetime import datetime

logger = logging.getLogger("oscar_bot")


class BotState:
    def __init__(self):
        self.announced: set[str] = set()
        self.action_log: list[dict] = []
        self.consecutive_errors = 0
        self.last_content_hash: str | None = None

    def mark_announced(self, category: str):
        self.announced.add(category)
        logger.info(f"Marked '{category}' as announced ({len(self.announced)}/19)")

    def is_announced(self, category: str) -> bool:
        return category in self.announced

    def log_action(self, action: str, details: dict):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            **details,
        }
        self.action_log.append(entry)
        logger.info(f"[{action}] {details}")

    def record_error(self):
        self.consecutive_errors += 1
        return self.consecutive_errors

    def clear_errors(self):
        self.consecutive_errors = 0

    def all_announced(self) -> bool:
        return len(self.announced) >= 19
