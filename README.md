# Oscar Bait

A real-time Oscar predictions game. Players rank nominees across all 19 categories, lock in their picks, and compete on a live leaderboard as winners are announced.

## How It Works

1. **Players** create a profile and rank nominees in each category (drag-and-drop)
2. **Lock in** picks before the ceremony starts
3. **Admin** announces winners in real-time as they happen
4. **Leaderboard** updates live with scores, streaks, and rank movements

Scoring: higher rank = more points. If a category has 5 nominees and you ranked the winner #1, you get 5 points. Ranked #3? You get 3 points.

## Tech Stack

- **Frontend:** React 18, React Router, dnd-kit (drag-and-drop), canvas-confetti
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

## Admin Panel

Navigate to `/admin` and enter your passcode. From there you can:

- Announce winners as they're revealed during the ceremony
- Clear/change a winner if you made a mistake
- Delete players
