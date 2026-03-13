# AGENTS.md — Oscar Bait

## Project Overview

Oscar Bait is a multiplayer Oscars prediction game for watch parties. Players stack-rank nominees in each of the 24 categories of the 98th Academy Awards (March 15, 2026). Points are awarded based on how high you ranked the actual winner. The app runs on a single server, containerized with Docker, designed for a single evening of use on a local network or simple cloud host.

This is a one-night game, not a SaaS product. Optimize for speed of development, reliability, and fun UX. Do not over-engineer.

## Tech Stack

- **Frontend**: React 18 with Tailwind CSS (Create React App / react-scripts)
- **Backend**: Python 3.12 with FastAPI
- **Database**: SQLite via raw `sqlite3` (single file DB, no ORM)
- **Containerization**: Docker with docker-compose
- **Drag and Drop**: @dnd-kit/core + @dnd-kit/sortable
- **Effects**: canvas-confetti, Web Audio API (synthesized sound effects)

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
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── App.js            # Root component, routing, polling, reveal queue
│       ├── api.js            # Centralized API client
│       ├── sounds.js         # Web Audio synthesized sound effects
│       └── components/
│           ├── Home.js           # Landing page, name entry
│           ├── Ballot.js         # Main ranking interface with drag-and-drop
│           ├── SortableNominee.js # dnd-kit sortable item wrapper
│           ├── Leaderboard.js    # Live scoreboard with expandable player cards
│           ├── Admin.js          # Winner selection UI (passcode-gated)
│           └── RevealOverlay.jsx # Full-screen winner reveal animation
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
- **Hash-based admin routing**: Navigate to `#admin` to access the admin panel. No React Router — page state is managed via useState in App.js.

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

1. **Envelope phase** (2s) — suspenseful drumroll sound, "And the Oscar goes to..." text
2. **Winner phase** (2.5s) — reveal sting sound, winner name with confetti burst
3. **Scoreboard phase** (10s) — per-player results for that category, showing rank given and points earned

Sound effects are synthesized via Web Audio API (no audio files). Players who ranked the winner #1 get a special "perfect pick" fanfare.

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
- `GET /api/announcements/latest` — latest winner announcement with per-player results

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `ADMIN_PASSCODE` | Password for the admin panel | Yes |
| `DB_PATH` | SQLite database path (default: `oscar_bait.db`) | No |

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

## Common Pitfalls to Avoid

- Do not use websockets. Polling is simpler and sufficient.
- Do not add user authentication or sessions beyond the name + localStorage player ID pattern.
- Do not use a separate database container. SQLite is the right tool here.
- Do not alphabetize categories. Ceremony order matters for the game flow.
- Do not make the admin panel pretty. Functional and fast is the goal.
- Do not forget mobile. Most players will be on their phones.
- Do not use heavyweight animation libraries. CSS transitions and canvas-confetti are plenty.
- Do not hardcode the admin passcode. It must come from the `ADMIN_PASSCODE` environment variable.
