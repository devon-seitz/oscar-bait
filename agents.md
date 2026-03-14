# AGENTS.md — Oscar Bait

## Project Overview

Oscar Bait is a multiplayer Oscars prediction game for watch parties. Players stack-rank nominees in each of the 19 categories of the 98th Academy Awards (March 15, 2026). Points are awarded based on how high you ranked the actual winner. The app runs on a single server, containerized with Docker, designed for a single evening of use on a local network or simple cloud host.

This is a one-night game, not a SaaS product. Optimize for speed of development, reliability, and fun UX. Do not over-engineer.

## Tech Stack

- **Frontend**: React 18 with Tailwind CSS (Create React App / react-scripts)
- **Backend**: Python 3.12 with FastAPI
- **Database**: SQLite via raw `sqlite3` (single file DB, no ORM)
- **Containerization**: Docker with docker-compose
- **Drag and Drop**: @dnd-kit/core + @dnd-kit/sortable
- **Effects**: canvas-confetti

## Project Structure

```
oscar-bait/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── .gitignore
├── .env.example
├── agents.md
├── README.md
├── backend/
│   ├── main.py              # FastAPI app — all routes in one file
│   ├── database.py           # DB connection, init_db(), CATEGORIES list
│   └── requirements.txt
├── bot/
│   ├── __main__.py          # Entry point for `python -m bot`
│   ├── runner.py            # Main polling loop + confirm/auto mode
│   ├── scraper.py           # Live blog HTTP fetch + HTML parsing
│   ├── extractor.py         # Claude API extraction + validation
│   ├── announcer.py         # Admin API caller
│   ├── state.py             # Announced category tracking
│   ├── config.py            # Environment variable loading
│   ├── requirements.txt
│   ├── Dockerfile
│   └── test/
│       ├── mock_server.py   # Fake live blog server on :9000
│       └── announce.py      # CLI to add fake winner entries
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── App.js            # Root component, hash-based routing, polling, reveal queue
│       ├── api.js            # Centralized API client
│       └── components/
│           ├── Home.js           # Landing page, name entry, sparkle animation
│           ├── Ballot.js         # Main ranking interface with drag-and-drop
│           ├── SortableNominee.js # dnd-kit sortable item wrapper
│           ├── Leaderboard.js    # Live scoreboard with expandable player cards
│           ├── Admin.js          # Winner selection UI (passcode-gated)
│           ├── RevealOverlay.jsx # Full-screen winner reveal animation
│           └── OnboardingOverlay.jsx
```

## Architecture Decisions

- **Single container**: Backend serves both the API and the built frontend static files. No nginx, no separate frontend container. FastAPI mounts the CRA build output as static files.
- **No ORM**: Uses raw `sqlite3` with `Row` factory. Simple queries, no migrations framework.
- **No auth**: Players register with just a name. Duplicate names are rejected. Player ID stored in localStorage on the client.
- **Admin access**: Passcode set via `ADMIN_PASSCODE` environment variable. Validated server-side via `/api/admin/verify` endpoint. No sessions — passcode stored in sessionStorage and sent with each admin request.
- **Polling, not websockets**: App polls every 12 seconds for leaderboard, categories, and new winner announcements. Websockets are overkill for a watch party of 5 to 30 people.
- **SQLite**: Single file at configurable `DB_PATH` (default: `oscar_bait.db`). Mounted as a Docker volume so data persists across container restarts.
- **Categories hardcoded in Python**: The `CATEGORIES` list lives in `database.py` — no separate JSON file or seed script.
- **All routes in one file**: `main.py` contains all API endpoints. No routers directory — the app is small enough that splitting would add complexity without benefit.
- **Hash-based routing**: All pages use URL hash (`#ballot`, `#leaderboard`, `#admin`, `#about`). Page state persists across refreshes and browser back/forward works. No React Router.
- **Maintenance mode**: Set `MAINTENANCE_MODE=true` env var to show a holding page instead of the login screen. Admin access is unaffected.

## Scoring Logic

```
points = total_nominees_in_category - (player_rank - 1)
```

If a category has N nominees and the player ranked the winner at position R (1-indexed), they get `N - R + 1` points.

Example: Best Picture (10 nominees). Player ranks Sinners at #3. Sinners wins. Player gets 10 - 3 + 1 = 8 points.

If a player did not submit picks for a category, they get 0 points for that category.

## Design System

### Colors
- **Background**: #0A0A0A (near black)
- **Gold primary**: #C5A44E
- **Gold light**: #D4B96A (hover states, accents)
- **Gold dark**: #A68A3E (borders, subtle elements)
- **Surface**: #141414 (cards, panels)
- **Surface elevated**: #1E1E1E (modals, dropdowns)
- **Text primary**: #FAF8F5 (warm white)
- **Text secondary**: #A0A0A0 (muted)
- **Success**: #4CAF50 (locked in, confirmed)
- **Error**: #E57373

### Typography
- **Headings**: Serif font (font-serif class)
- **Body**: Sans-serif (font-sans class)

### Component Patterns
- Cards have 1px solid border in gold with subtle gold glow on hover
- Buttons: gold gradient with dark text for primary actions, outlined gold for secondary
- Drag handles are clearly visible with grip dots icon
- Rank numbers are prominent (large, gold, serif font)
- Leaderboard uses gold/silver/bronze styling for top 3 positions
- Mobile first — everything works at 375px width

## Winner Reveal System

When admin announces a winner, the app detects it on the next poll cycle and triggers a multi-phase full-screen overlay:

1. **Envelope phase** (2s) — "And the Oscar goes to..." text
2. **Winner phase** (2.5s) — winner name with confetti burst
3. **Scoreboard phase** (5s) — per-player results for that category, showing rank given and points earned

## API Endpoints

All endpoints prefixed with `/api/`. JSON request and response bodies.

- `POST /api/players` — create player
- `GET /api/players` — list players
- `POST /api/picks/{player_id}` — submit rankings for a category
- `POST /api/picks/{player_id}/lock` — lock all picks
- `GET /api/picks/{player_id}` — get player's picks
- `POST /api/admin/verify` — verify admin passcode
- `POST /api/admin/winner` — announce winner (snapshots ranks first)
- `POST /api/admin/clear-winner` — clear a winner
- `POST /api/admin/delete-player` — delete a player
- `GET /api/categories` — list categories with winners
- `GET /api/leaderboard` — full leaderboard with detailed stats
- `GET /api/maintenance` — maintenance mode status
- `GET /api/announcements/latest` — latest winner announcement with per-player results

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `ADMIN_PASSCODE` | Password for the admin panel | Yes |
| `DB_PATH` | SQLite database path (default: `oscar_bait.db`) | No |
| `MAINTENANCE_MODE` | Set to `true`/`1`/`yes` to show maintenance page (default: off) | No |

## Commands

```bash
# Run with Docker
cp .env.example .env
# Edit .env and set ADMIN_PASSCODE
docker-compose up --build

# The app is accessible at http://localhost:8000
# API docs at http://localhost:8000/docs (Swagger UI)
# Admin panel at http://localhost:8000/#admin

# Local backend development
cd backend
ADMIN_PASSCODE=yourpass uvicorn main:app --reload --port 8000

# Local frontend development
cd frontend
npm install && npm start
```

## Oscar Bot (Automated Winner Announcer)

A standalone Python script in `bot/` that scrapes live blogs during the ceremony and uses Claude to automatically announce winners via the admin API.

### How It Works

1. Polls live blog sources (AP News, Deadline, Variety) every 45 seconds
2. Sends scraped text + unannounced categories to Claude Sonnet for structured extraction
3. Validates extracted winner strings match CATEGORIES exactly (accent-sensitive, em-dash aware)
4. Calls `POST /api/admin/winner` to announce — same endpoint the admin panel uses

### Bot Structure

```
bot/
├── __init__.py
├── __main__.py          # Entry point for `python -m bot`
├── runner.py            # Main polling loop, confirm/auto mode
├── scraper.py           # HTTP fetch + BeautifulSoup parsing
├── extractor.py         # Claude API prompt + response validation
├── announcer.py         # Admin API caller + CATEGORIES validation
├── state.py             # Tracks announced categories, action log
├── config.py            # Environment variable loading
├── requirements.txt     # anthropic, httpx, beautifulsoup4
└── Dockerfile
```

### Bot Environment Variables

| Variable | Description | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude calls | Yes (for bot) |
| `BOT_MODE` | `auto` (default) or `confirm` (prompts before announcing) | No |
| `POLL_INTERVAL` | Seconds between poll cycles (default: 45) | No |
| `OSCAR_API_URL` | Base URL of the oscar-bait API (default: `http://localhost:8000`) | No |
| `SOURCE_AP_URL` | Override AP News live blog URL | No |
| `SOURCE_DEADLINE_URL` | Override Deadline live blog URL | No |
| `SOURCE_VARIETY_URL` | Override Variety live blog URL | No |

### Running the Bot

```bash
# Locally
cd oscar-bait
pip install -r bot/requirements.txt
python -m bot

# Via Docker Compose (runs alongside the app)
docker compose up --build
```

### Testing the Bot

A mock live blog server and announce script live in `bot/test/` for end-to-end testing without real live blog sources.

**`bot/test/mock_server.py`** — Serves a fake live blog at `http://localhost:9000/live`. Reads entries from `bot/test/entries.json` and renders them as HTML. Re-reads the file on every request so new entries appear immediately.

**`bot/test/announce.py`** — CLI tool to add fake winner entries to the mock blog. Interactive menu lets you pick a category and nominee, or pass a category name as an argument for a random winner. Uses varied phrasings ("And the Oscar goes to...", "WINNER:", "{name} wins the Oscar for...", etc.) to test extraction robustness.

**Full end-to-end test (3 terminals):**

```bash
# Terminal 1 — app
docker compose up oscar-bait

# Terminal 2 — mock blog server
python -m bot.test.mock_server

# Terminal 3 — bot pointed at mock blog
SOURCE_AP_URL=http://localhost:9000/live \
SOURCE_DEADLINE_URL=http://localhost:9000/live \
SOURCE_VARIETY_URL=http://localhost:9000/live \
python -m bot
```

Then add fake winners:
```bash
python -m bot.test.announce                  # interactive
python -m bot.test.announce "Best Picture"   # random winner for category
```

The bot will detect the new entry on its next poll cycle, extract the winner via Claude, and announce it to the app.

### Safety Features

- Only "high" confidence extractions are auto-announced
- All extracted strings validated against exact CATEGORIES entries before API call
- Circuit breaker pauses 5 min after 3 consecutive Claude API errors
- Deduplication: seeds from `GET /api/categories` on startup, tracks announced set
- Every action logged with timestamps and source quotes
- Use `POST /api/admin/clear-winner` to undo any mistakes

## Common Pitfalls to Avoid

- Do not use websockets. Polling is simpler and sufficient.
- Do not add user authentication or sessions beyond the name + localStorage player ID pattern.
- Do not use a separate database container. SQLite is the right tool here.
- Do not alphabetize categories. Ceremony order matters for the game flow.
- Do not make the admin panel pretty. Functional and fast is the goal.
- Do not forget mobile. Most players will be on their phones.
- Do not use heavyweight animation libraries. CSS transitions and canvas-confetti are plenty.
- Do not hardcode the admin passcode. It must come from the `ADMIN_PASSCODE` environment variable.
