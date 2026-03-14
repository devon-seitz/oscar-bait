"""
Mock live blog server for testing the Oscar Bot.

Serves a fake live blog page at http://localhost:9000/live
that the bot can scrape. Use announce.py to add winner entries.
"""

import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ENTRIES_FILE = Path(__file__).parent / "entries.json"
PORT = 9000


def load_entries() -> list[str]:
    if ENTRIES_FILE.exists():
        return json.loads(ENTRIES_FILE.read_text())
    return []


class MockBlogHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/live":
            entries = load_entries()
            html = self._build_page(entries)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode())
        else:
            self.send_response(404)
            self.end_headers()

    def _build_page(self, entries: list[str]) -> str:
        entry_html = ""
        for entry in reversed(entries):  # newest first, like a real live blog
            entry_html += f'    <div class="liveblog-entry"><p>{entry}</p></div>\n'

        return f"""<!DOCTYPE html>
<html>
<head><title>Mock Oscar Live Blog</title></head>
<body>
<main>
  <h1>98th Academy Awards — Live Blog</h1>
{entry_html if entry_html else '  <p>Ceremony has not started yet. Stay tuned!</p>'}
</main>
</body>
</html>"""

    def log_message(self, format, *args):
        # Quiet logging — only show requests
        pass


def main():
    # Start fresh
    if not ENTRIES_FILE.exists():
        ENTRIES_FILE.write_text("[]")

    server = HTTPServer(("", PORT), MockBlogHandler)
    print(f"Mock live blog server running at http://localhost:{PORT}/live")
    print(f"Entries file: {ENTRIES_FILE}")
    print("Use 'python -m bot.test.announce' to add winner announcements.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    main()
