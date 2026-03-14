"""Tests for the scoring logic — the one thing that really can't be wrong."""
import sqlite3
import json
import os
import pytest

# Point at an in-memory DB so we never touch real data
os.environ["DB_PATH"] = ":memory:"
os.environ["ADMIN_PASSCODE"] = "testpasscode"

from database import get_db, init_db, CATEGORIES
from main import _compute_leaderboard_scores


@pytest.fixture()
def db():
    """Fresh in-memory database for each test."""
    # Re-patch DB_PATH each time (import caches it, but connect uses the module-level var)
    import database
    database.DB_PATH = ":memory:"

    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript("""
        CREATE TABLE players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE picks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            rankings TEXT NOT NULL,
            locked INTEGER DEFAULT 0,
            FOREIGN KEY (player_id) REFERENCES players(id),
            UNIQUE(player_id, category)
        );
        CREATE TABLE winners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT UNIQUE NOT NULL,
            winner TEXT NOT NULL,
            announced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE previous_ranks (
            player_id INTEGER PRIMARY KEY,
            rank INTEGER NOT NULL,
            FOREIGN KEY (player_id) REFERENCES players(id)
        );
    """)
    conn.commit()
    return conn


def _add_player(db, name):
    db.execute("INSERT INTO players (name, password_hash) VALUES (?, ?)", (name, "hash"))
    db.commit()
    return db.execute("SELECT id FROM players WHERE name = ?", (name,)).fetchone()["id"]


def _add_pick(db, player_id, category, rankings):
    db.execute(
        "INSERT INTO picks (player_id, category, rankings) VALUES (?, ?, ?)",
        (player_id, category, json.dumps(rankings))
    )
    db.commit()


def _announce_winner(db, category, winner):
    db.execute("INSERT INTO winners (category, winner) VALUES (?, ?)", (category, winner))
    db.commit()


# ─── Tests ───────────────────────────────────────────────────────────


class TestBasicScoring:
    """Core scoring formula: points = num_nominees - rank_position"""

    def test_perfect_pick_gets_max_points(self, db):
        """Ranking the winner #1 gives max points (num_nominees)."""
        cat = CATEGORIES[0]  # Best Picture, 10 nominees
        winner = cat["nominees"][0]
        pid = _add_player(db, "Alice")
        _add_pick(db, pid, cat["name"], cat["nominees"])  # winner is at index 0
        _announce_winner(db, cat["name"], winner)

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["total_score"] == len(cat["nominees"])  # 10

    def test_last_place_pick_gets_one_point(self, db):
        """Ranking the winner last gives 1 point."""
        cat = CATEGORIES[0]
        winner = cat["nominees"][0]
        pid = _add_player(db, "Bob")
        # Put winner at the end
        rankings = cat["nominees"][1:] + [winner]
        _add_pick(db, pid, cat["name"], rankings)
        _announce_winner(db, cat["name"], winner)

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["total_score"] == 1

    def test_middle_pick_scores_correctly(self, db):
        """Ranking the winner at position 3 (0-indexed=2) in a 5-nominee category gives 3 points."""
        cat = CATEGORIES[1]  # Best Director, 5 nominees
        winner = cat["nominees"][0]
        pid = _add_player(db, "Carol")
        # Put winner at index 2 (rank #3)
        rankings = [cat["nominees"][1], cat["nominees"][2], winner, cat["nominees"][3], cat["nominees"][4]]
        _add_pick(db, pid, cat["name"], rankings)
        _announce_winner(db, cat["name"], winner)

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["total_score"] == 3  # 5 - 2 = 3


class TestNoPicksOrNoWinner:
    """Edge cases where players have no picks or no winner is announced."""

    def test_no_picks_gives_zero(self, db):
        """Player with no picks for a category gets 0 points."""
        cat = CATEGORIES[0]
        winner = cat["nominees"][0]
        pid = _add_player(db, "Dave")
        _announce_winner(db, cat["name"], winner)

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["total_score"] == 0

    def test_no_winners_announced_gives_zero(self, db):
        """No winners announced = everyone at 0."""
        cat = CATEGORIES[0]
        pid = _add_player(db, "Eve")
        _add_pick(db, pid, cat["name"], cat["nominees"])

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["total_score"] == 0

    def test_no_players(self, db):
        """Empty leaderboard when no players exist."""
        lb = _compute_leaderboard_scores(db)
        assert lb == []


class TestMultipleCategories:
    """Scores accumulate across multiple categories."""

    def test_scores_sum_across_categories(self, db):
        pid = _add_player(db, "Frank")

        total_expected = 0
        for cat in CATEGORIES[:3]:  # First 3 categories
            winner = cat["nominees"][0]
            _add_pick(db, pid, cat["name"], cat["nominees"])  # winner at #1
            _announce_winner(db, cat["name"], winner)
            total_expected += len(cat["nominees"])

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["total_score"] == total_expected

    def test_partial_picks_only_score_submitted_categories(self, db):
        """Player only picked in 1 of 2 announced categories."""
        pid = _add_player(db, "Grace")

        cat1 = CATEGORIES[0]
        cat2 = CATEGORIES[1]
        winner1 = cat1["nominees"][0]
        winner2 = cat2["nominees"][0]

        # Only submit picks for cat1
        _add_pick(db, pid, cat1["name"], cat1["nominees"])
        _announce_winner(db, cat1["name"], winner1)
        _announce_winner(db, cat2["name"], winner2)

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["total_score"] == len(cat1["nominees"])  # Only cat1 points


class TestMultiplePlayers:
    """Leaderboard sorting and multiple players."""

    def test_sorting_by_score_descending(self, db):
        cat = CATEGORIES[0]
        winner = cat["nominees"][0]

        alice = _add_player(db, "Alice")
        bob = _add_player(db, "Bob")

        # Alice: winner at #1 (max points)
        _add_pick(db, alice, cat["name"], cat["nominees"])
        # Bob: winner at #3
        rankings_bob = [cat["nominees"][1], cat["nominees"][2], winner] + cat["nominees"][3:]
        _add_pick(db, bob, cat["name"], rankings_bob)
        _announce_winner(db, cat["name"], winner)

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["name"] == "Alice"
        assert lb[1]["name"] == "Bob"
        assert lb[0]["total_score"] > lb[1]["total_score"]

    def test_tied_players_sorted_alphabetically(self, db):
        """Players with the same score are sorted by name."""
        cat = CATEGORIES[0]
        winner = cat["nominees"][0]

        zara = _add_player(db, "Zara")
        anna = _add_player(db, "Anna")

        # Both rank winner at #1
        _add_pick(db, zara, cat["name"], cat["nominees"])
        _add_pick(db, anna, cat["name"], cat["nominees"])
        _announce_winner(db, cat["name"], winner)

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["name"] == "Anna"
        assert lb[1]["name"] == "Zara"


class TestRemovedCategories:
    """Categories removed from CATEGORIES list are safely ignored."""

    def test_picks_for_removed_category_ignored(self, db):
        """Picks for a category not in CATEGORIES don't cause errors or score."""
        pid = _add_player(db, "Helen")
        _add_pick(db, pid, "Best Animated Short", ["Butterfly", "Forevergreen"])
        _announce_winner(db, "Best Animated Short", "Butterfly")

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["total_score"] == 0  # Removed category, no points

    def test_mix_of_valid_and_removed_categories(self, db):
        """Valid category scores correctly while removed category is ignored."""
        pid = _add_player(db, "Ivan")

        # Valid category
        cat = CATEGORIES[0]
        winner = cat["nominees"][0]
        _add_pick(db, pid, cat["name"], cat["nominees"])
        _announce_winner(db, cat["name"], winner)

        # Removed category
        _add_pick(db, pid, "Best Documentary Feature", ["The Alabama Solution"])
        _announce_winner(db, "Best Documentary Feature", "The Alabama Solution")

        lb = _compute_leaderboard_scores(db)
        assert lb[0]["total_score"] == len(cat["nominees"])  # Only valid category counted
