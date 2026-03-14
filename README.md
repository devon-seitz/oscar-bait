# Oscar Bait

A real-time Oscar predictions game. Players rank nominees across all 19 categories, lock in their picks, and compete on a live leaderboard as winners are announced.

## How It Works

1. **Players** create a profile and rank nominees in each category (drag-and-drop)
2. **Lock in** picks before the ceremony starts
3. **Winners** are announced in real-time — manually via the admin panel, or automatically via the Oscar Bot
4. **Leaderboard** updates live with scores, streaks, and rank movements

Scoring: higher rank = more points. If a category has 5 nominees and you ranked the winner #1, you get 5 points. Ranked #3? You get 3 points.

## Tech Stack

- **Frontend:** React 18, dnd-kit (drag-and-drop), canvas-confetti
- **Backend:** Python / FastAPI / SQLite
- **Deployment:** Docker

## Quick Start

### Docker (recommended)

```bash
cp .env.example .env
# Edit .env and set your ADMIN_PASSCODE
docker-compose up --build
```

App runs at `http://localhost:8000`.

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
ADMIN_PASSCODE=your_passcode uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

Frontend dev server runs at `http://localhost:3000` and proxies API requests to the backend.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `ADMIN_PASSCODE` | Password for the admin panel | Yes |
| `DB_PATH` | SQLite database path (default: `oscar_bait.db`) | No |
| `MAINTENANCE_MODE` | Set to `true` to show a holding page (default: off) | No |

## Admin Panel

Navigate to `/#admin` and enter your passcode. From there you can:

- Announce winners as they're revealed during the ceremony
- Clear/change a winner if you made a mistake
- Delete players

## Oscar Bot (Automated Winner Announcer)

Instead of manually announcing winners, you can run the Oscar Bot — a Claude-powered script that scrapes live blogs (AP News, Deadline, Variety) during the ceremony and automatically announces winners as they happen.

### Setup

1. Add your Anthropic API key to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Run alongside the app:
   ```bash
   # Via Docker Compose (starts both app and bot)
   docker compose up --build

   # Or run the bot locally
   pip install -r bot/requirements.txt
   python -m bot
   ```

### How It Works

- Polls live blog sources every 45 seconds
- Sends scraped text to Claude, which extracts announced winners
- Validates extracted winners against the exact nominee strings before announcing
- Calls the same admin API endpoint the manual panel uses

### Bot Modes

- **`auto`** (default) — announces winners immediately when detected
- **`confirm`** — prints each detected winner to the terminal and waits for you to approve with `y/n`

Set via the `BOT_MODE` environment variable.

### Bot Environment Variables

| Variable | Description | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Yes |
| `BOT_MODE` | `auto` (default) or `confirm` | No |
| `POLL_INTERVAL` | Seconds between polls (default: 45) | No |
| `OSCAR_API_URL` | API base URL (default: `http://localhost:8000`) | No |
| `SOURCE_AP_URL` | Override AP News live blog URL | No |
| `SOURCE_DEADLINE_URL` | Override Deadline live blog URL | No |
| `SOURCE_VARIETY_URL` | Override Variety live blog URL | No |

### Testing the Bot

A mock live blog server is included so you can test the full pipeline without waiting for the real ceremony. You'll need 3 terminals:

**Terminal 1** — Start the app:
```bash
docker compose up oscar-bait
```

**Terminal 2** — Start the mock live blog server:
```bash
python -m bot.test.mock_server
```
This serves a fake live blog at `http://localhost:9000/live`.

**Terminal 3** — Start the bot pointed at the mock blog:
```bash
SOURCE_AP_URL=http://localhost:9000/live \
SOURCE_DEADLINE_URL=http://localhost:9000/live \
SOURCE_VARIETY_URL=http://localhost:9000/live \
python -m bot
```

Then add fake winner announcements from any terminal:
```bash
# Interactive menu — pick a category and nominee
python -m bot.test.announce

# Or announce a random winner for a specific category
python -m bot.test.announce "Best Picture"
```

The announce script uses varied phrasings ("And the Oscar goes to...", "WINNER:", etc.) to test Claude's extraction robustness. On the bot's next poll cycle, it will detect the winner and announce it to the app — you'll see it appear on the leaderboard and trigger the reveal animation.
