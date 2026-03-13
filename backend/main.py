from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from database import get_db, init_db, CATEGORIES
import json
import os

app = FastAPI(title="Oscar Bait API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ADMIN_PASSCODE = os.environ.get("ADMIN_PASSCODE", "")


class PasscodeVerify(BaseModel):
    passcode: str


class PlayerCreate(BaseModel):
    name: str


class PicksSubmit(BaseModel):
    category: str
    rankings: list[str]


class PlayerDelete(BaseModel):
    player_id: int
    passcode: str


class WinnerClear(BaseModel):
    category: str
    passcode: str


class WinnerSet(BaseModel):
    category: str
    winner: str
    passcode: str


@app.on_event("startup")
def startup():
    init_db()


@app.post("/api/players")
def create_player(player: PlayerCreate):
    name = player.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    db = get_db()
    try:
        cursor = db.execute("INSERT INTO players (name) VALUES (?)", (name,))
        db.commit()
        player_id = cursor.lastrowid
    except Exception:
        # Player already exists, return existing
        row = db.execute("SELECT id, name FROM players WHERE name = ?", (name,)).fetchone()
        if row:
            db.close()
            return {"id": row["id"], "name": row["name"]}
        db.close()
        raise HTTPException(status_code=400, detail="Could not create player")
    db.close()
    return {"id": player_id, "name": name}


@app.get("/api/players")
def list_players():
    db = get_db()
    rows = db.execute("SELECT id, name FROM players ORDER BY name").fetchall()
    db.close()
    return [{"id": r["id"], "name": r["name"]} for r in rows]


@app.post("/api/picks/{player_id}")
def submit_picks(player_id: int, picks: PicksSubmit):
    db = get_db()
    player = db.execute("SELECT id FROM players WHERE id = ?", (player_id,)).fetchone()
    if not player:
        db.close()
        raise HTTPException(status_code=404, detail="Player not found")

    # Validate category
    valid_categories = [c["name"] for c in CATEGORIES]
    if picks.category not in valid_categories:
        db.close()
        raise HTTPException(status_code=400, detail="Invalid category")

    # Check if already locked
    existing = db.execute(
        "SELECT locked FROM picks WHERE player_id = ? AND category = ?",
        (player_id, picks.category)
    ).fetchone()
    if existing and existing["locked"]:
        db.close()
        raise HTTPException(status_code=400, detail="Picks are locked for this category")

    rankings_json = json.dumps(picks.rankings)
    db.execute(
        """INSERT INTO picks (player_id, category, rankings)
           VALUES (?, ?, ?)
           ON CONFLICT(player_id, category) DO UPDATE SET rankings = ?""",
        (player_id, picks.category, rankings_json, rankings_json)
    )
    db.commit()
    db.close()
    return {"status": "ok"}


@app.post("/api/picks/{player_id}/lock")
def lock_picks(player_id: int):
    db = get_db()
    player = db.execute("SELECT id FROM players WHERE id = ?", (player_id,)).fetchone()
    if not player:
        db.close()
        raise HTTPException(status_code=404, detail="Player not found")

    db.execute("UPDATE picks SET locked = 1 WHERE player_id = ?", (player_id,))
    db.commit()
    db.close()
    return {"status": "locked"}


@app.get("/api/picks/{player_id}")
def get_picks(player_id: int):
    db = get_db()
    rows = db.execute(
        "SELECT category, rankings, locked FROM picks WHERE player_id = ?",
        (player_id,)
    ).fetchall()
    db.close()
    result = {}
    for r in rows:
        result[r["category"]] = {
            "rankings": json.loads(r["rankings"]),
            "locked": bool(r["locked"])
        }
    return result


def _compute_leaderboard_scores(db):
    """Compute leaderboard scores and return sorted list. Used by both leaderboard endpoint and rank snapshot."""
    players = db.execute("SELECT id, name FROM players").fetchall()
    winner_rows = db.execute("SELECT category, winner FROM winners").fetchall()
    winners = {r["category"]: r["winner"] for r in winner_rows}
    category_map = {c["name"]: c for c in CATEGORIES}

    leaderboard = []
    for player in players:
        pick_rows = db.execute(
            "SELECT category, rankings FROM picks WHERE player_id = ?",
            (player["id"],)
        ).fetchall()

        total_score = 0
        for pick in pick_rows:
            cat_name = pick["category"]
            if cat_name not in winners:
                continue
            rankings = json.loads(pick["rankings"])
            winner = winners[cat_name]
            num_nominees = len(category_map[cat_name]["nominees"])
            if winner in rankings:
                rank_position = rankings.index(winner)
                total_score += num_nominees - rank_position

        leaderboard.append({"player_id": player["id"], "name": player["name"], "total_score": total_score})

    leaderboard.sort(key=lambda x: (-x["total_score"], x["name"]))
    return leaderboard


def _snapshot_current_ranks(db):
    """Save current leaderboard ranks to previous_ranks table (called before announcing a new winner)."""
    lb = _compute_leaderboard_scores(db)
    db.execute("DELETE FROM previous_ranks")
    for idx, entry in enumerate(lb):
        db.execute("INSERT INTO previous_ranks (player_id, rank) VALUES (?, ?)", (entry["player_id"], idx + 1))


@app.post("/api/admin/verify")
def verify_passcode(data: PasscodeVerify):
    if data.passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=403, detail="Invalid passcode")
    return {"status": "ok"}


@app.post("/api/admin/winner")
def set_winner(data: WinnerSet):
    if data.passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=403, detail="Invalid passcode")

    valid_categories = {c["name"]: c["nominees"] for c in CATEGORIES}
    if data.category not in valid_categories:
        raise HTTPException(status_code=400, detail="Invalid category")
    if data.winner not in valid_categories[data.category]:
        raise HTTPException(status_code=400, detail="Invalid nominee for this category")

    db = get_db()
    # Snapshot current ranks BEFORE announcing the new winner
    _snapshot_current_ranks(db)

    db.execute(
        """INSERT INTO winners (category, winner)
           VALUES (?, ?)
           ON CONFLICT(category) DO UPDATE SET winner = ?, announced_at = CURRENT_TIMESTAMP""",
        (data.category, data.winner, data.winner)
    )
    db.commit()
    db.close()
    return {"status": "ok", "category": data.category, "winner": data.winner}


@app.post("/api/admin/clear-winner")
def clear_winner(data: WinnerClear):
    if data.passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=403, detail="Invalid passcode")

    db = get_db()
    db.execute("DELETE FROM winners WHERE category = ?", (data.category,))
    db.commit()
    db.close()
    return {"status": "ok", "category": data.category}


@app.post("/api/admin/delete-player")
def delete_player(data: PlayerDelete):
    if data.passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=403, detail="Invalid passcode")

    db = get_db()
    player = db.execute("SELECT id, name FROM players WHERE id = ?", (data.player_id,)).fetchone()
    if not player:
        db.close()
        raise HTTPException(status_code=404, detail="Player not found")

    name = player["name"]
    db.execute("DELETE FROM picks WHERE player_id = ?", (data.player_id,))
    db.execute("DELETE FROM players WHERE id = ?", (data.player_id,))
    db.commit()
    db.close()
    return {"status": "ok", "deleted": name}


@app.get("/api/categories")
def get_categories():
    db = get_db()
    winner_rows = db.execute("SELECT category, winner FROM winners").fetchall()
    db.close()
    winners = {r["category"]: r["winner"] for r in winner_rows}

    result = []
    for cat in CATEGORIES:
        result.append({
            "name": cat["name"],
            "nominees": cat["nominees"],
            "winner": winners.get(cat["name"])
        })
    return result


@app.get("/api/leaderboard")
def get_leaderboard():
    db = get_db()
    players = db.execute("SELECT id, name FROM players").fetchall()
    winner_rows = db.execute("SELECT category, winner, announced_at FROM winners ORDER BY announced_at ASC").fetchall()
    winners = {r["category"]: r["winner"] for r in winner_rows}
    announcement_order = [r["category"] for r in winner_rows]  # chronological order

    # Previous ranks for movement tracking
    prev_rank_rows = db.execute("SELECT player_id, rank FROM previous_ranks").fetchall()
    prev_ranks = {r["player_id"]: r["rank"] for r in prev_rank_rows}

    category_map = {c["name"]: c for c in CATEGORIES}
    leaderboard = []

    for player in players:
        pick_rows = db.execute(
            "SELECT category, rankings FROM picks WHERE player_id = ?",
            (player["id"],)
        ).fetchall()
        picks_by_cat = {r["category"]: json.loads(r["rankings"]) for r in pick_rows}

        total_score = 0
        category_scores = {}
        best_pick = None
        worst_pick = None
        perfect_picks = 0
        categories_scored = 0

        for cat_name, winner in winners.items():
            rankings = picks_by_cat.get(cat_name)
            num_nominees = len(category_map[cat_name]["nominees"])

            if rankings and winner in rankings:
                rank_position = rankings.index(winner)
                points = num_nominees - rank_position
                rank_given = rank_position + 1
            else:
                points = 0
                rank_given = None

            category_scores[cat_name] = {
                "points": points,
                "rank": rank_given,
                "winner": winner,
                "pick": rankings[0] if rankings else None,
                "rankings": rankings or []
            }
            total_score += points

            if rankings and winner in rankings:
                categories_scored += 1
                if rank_given == 1:
                    perfect_picks += 1
                if best_pick is None or points > best_pick["points"] or (points == best_pick["points"] and num_nominees > best_pick["num_nominees"]):
                    best_pick = {"category": cat_name, "rank": rank_given, "points": points, "num_nominees": num_nominees}
                if worst_pick is None or points < worst_pick["points"]:
                    worst_pick = {"category": cat_name, "rank": rank_given, "points": points, "num_nominees": num_nominees}

        # Win streak: count consecutive max-point categories from latest announcement backwards
        win_streak = 0
        for cat_name in reversed(announcement_order):
            if cat_name not in category_scores:
                break
            score = category_scores[cat_name]
            num_nominees = len(category_map[cat_name]["nominees"])
            if score["rank"] == 1:
                win_streak += 1
            else:
                break

        # Build per-category detail for expanded view (all categories, not just announced)
        picks_detail = {}
        for cat in CATEGORIES:
            cat_name = cat["name"]
            rankings = picks_by_cat.get(cat_name)
            announced = cat_name in winners
            if announced:
                winner = winners[cat_name]
                if rankings and winner in rankings:
                    rank_given = rankings.index(winner) + 1
                    pts = len(cat["nominees"]) - (rank_given - 1)
                else:
                    rank_given = None
                    pts = 0
                picks_detail[cat_name] = {
                    "pick": rankings[0] if rankings else None,
                    "full_rankings": rankings,
                    "winner": winner,
                    "rank": rank_given,
                    "points": pts,
                    "announced": True,
                    "has_picks": rankings is not None
                }
            else:
                picks_detail[cat_name] = {
                    "pick": rankings[0] if rankings else None,
                    "full_rankings": rankings,
                    "winner": None,
                    "rank": None,
                    "points": None,
                    "announced": False,
                    "has_picks": rankings is not None
                }

        # Clean up best/worst pick (remove internal num_nominees field)
        if best_pick:
            del best_pick["num_nominees"]
        if worst_pick:
            del worst_pick["num_nominees"]

        leaderboard.append({
            "player_id": player["id"],
            "name": player["name"],
            "total_score": total_score,
            "previous_rank": prev_ranks.get(player["id"]),
            "category_scores": category_scores,
            "best_pick": best_pick,
            "worst_pick": worst_pick,
            "perfect_picks": perfect_picks,
            "categories_scored": categories_scored,
            "categories_total": len(winners),
            "win_streak": win_streak,
            "picks_detail": picks_detail
        })

    leaderboard.sort(key=lambda x: (-x["total_score"], x["name"]))
    db.close()
    return leaderboard


@app.get("/api/announcements/latest")
def get_latest_announcement():
    db = get_db()
    latest = db.execute(
        "SELECT category, winner, announced_at FROM winners ORDER BY announced_at DESC LIMIT 1"
    ).fetchone()
    if not latest:
        db.close()
        return None

    category_name = latest["category"]
    winner = latest["winner"]
    announced_at = latest["announced_at"]

    # Find category info
    category_info = next((c for c in CATEGORIES if c["name"] == category_name), None)
    if not category_info:
        db.close()
        return None

    num_nominees = len(category_info["nominees"])

    # Get all winners for total score calculation
    all_winners = db.execute("SELECT category, winner FROM winners").fetchall()
    winners_map = {r["category"]: r["winner"] for r in all_winners}
    category_map = {c["name"]: c for c in CATEGORIES}

    # Get all players and their picks
    players = db.execute("SELECT id, name FROM players").fetchall()
    player_results = []

    for p in players:
        pick_rows = db.execute(
            "SELECT category, rankings FROM picks WHERE player_id = ?", (p["id"],)
        ).fetchall()
        picks_by_cat = {r["category"]: json.loads(r["rankings"]) for r in pick_rows}

        # Score for this category
        rankings = picks_by_cat.get(category_name)
        if rankings and winner in rankings:
            rank_given = rankings.index(winner) + 1
            points_earned = num_nominees - (rank_given - 1)
        else:
            rank_given = None
            points_earned = 0

        # Total score across all announced categories
        total_score = 0
        for cat_name, cat_winner in winners_map.items():
            cat_rankings = picks_by_cat.get(cat_name)
            if cat_rankings and cat_winner in cat_rankings:
                pos = cat_rankings.index(cat_winner)
                total_score += len(category_map[cat_name]["nominees"]) - pos

        player_results.append({
            "player_name": p["name"],
            "rank_given": rank_given,
            "points_earned": points_earned,
            "max_points": num_nominees,
            "total_score": total_score,
        })

    db.close()

    # Sort by points_earned desc, then name asc
    player_results.sort(key=lambda x: (-x["points_earned"], x["player_name"]))

    return {
        "category": category_name,
        "winner": winner,
        "announced_at": announced_at.replace(" ", "T") + "Z" if not announced_at.endswith("Z") else announced_at,
        "player_results": player_results,
    }


# Serve frontend static files (in production / Docker)
frontend_dir = "/app/frontend/build"
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
