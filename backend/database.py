import sqlite3
import json
import os
import logging

logger = logging.getLogger("oscar_bait")

DB_PATH = os.environ.get("DB_PATH", "oscar_bait.db")

CATEGORIES = [
    {
        "name": "Best Picture",
        "nominees": ["Bugonia", "F1", "Frankenstein", "Hamnet", "Marty Supreme", "One Battle After Another", "The Secret Agent", "Sentimental Value", "Sinners", "Train Dreams"]
    },
    {
        "name": "Best Director",
        "nominees": ["Chloé Zhao — Hamnet", "Josh Safdie — Marty Supreme", "Paul Thomas Anderson — One Battle After Another", "Joachim Trier — Sentimental Value", "Ryan Coogler — Sinners"]
    },
    {
        "name": "Best Actor",
        "nominees": ["Timothée Chalamet — Marty Supreme", "Leonardo DiCaprio — One Battle After Another", "Ethan Hawke — Blue Moon", "Michael B. Jordan — Sinners", "Wagner Moura — The Secret Agent"]
    },
    {
        "name": "Best Actress",
        "nominees": ["Jessie Buckley — Hamnet", "Rose Byrne — If I Had Legs I'd Kick You", "Kate Hudson — Song Sung Blue", "Renate Reinsve — Sentimental Value", "Emma Stone — Bugonia"]
    },
    {
        "name": "Best Supporting Actor",
        "nominees": ["Benicio del Toro — One Battle After Another", "Jacob Elordi — Frankenstein", "Delroy Lindo — Sinners", "Sean Penn — One Battle After Another", "Stellan Skarsgård — Sentimental Value"]
    },
    {
        "name": "Best Supporting Actress",
        "nominees": ["Elle Fanning — Sentimental Value", "Inga Ibsdotter Lilleaas — Sentimental Value", "Amy Madigan — Weapons", "Wunmi Mosaku — Sinners", "Teyana Taylor — One Battle After Another"]
    },
    {
        "name": "Best Animated Feature",
        "nominees": ["Arco", "Elio", "KPop Demon Hunters", "Little Amélie or the Character of Rain", "Zootopia 2"]
    },
    {
        "name": "Best Adapted Screenplay",
        "nominees": ["Bugonia — Will Tracy", "Frankenstein — Guillermo del Toro", "Hamnet — Chloé Zhao & Maggie O'Farrell", "One Battle After Another — Paul Thomas Anderson", "Train Dreams — Clint Bentley & Greg Kwedar"]
    },
    {
        "name": "Best Original Screenplay",
        "nominees": ["Blue Moon — Robert Kaplow", "It Was Just an Accident — Jafar Panahi", "Marty Supreme — Ronald Bronstein & Josh Safdie", "Sentimental Value — Eskil Vogt & Joachim Trier", "Sinners — Ryan Coogler"]
    },
    {
        "name": "Best Original Score",
        "nominees": ["Bugonia — Jerskin Fendrix", "Frankenstein — Alexandre Desplat", "Hamnet — Max Richter", "One Battle After Another — Jonny Greenwood", "Sinners — Ludwig Goransson"]
    },
    {
        "name": "Best Original Song",
        "nominees": ["\"Dear Me\" — Diane Warren: Relentless", "\"Golden\" — KPop Demon Hunters", "\"I Lied to You\" — Sinners", "\"Sweet Dreams of Joy\" — Viva Verdi!", "\"Train Dreams\" — Train Dreams"]
    },
    {
        "name": "Best Cinematography",
        "nominees": ["Frankenstein", "Marty Supreme", "One Battle After Another", "Sinners", "Train Dreams"]
    },
    {
        "name": "Best Film Editing",
        "nominees": ["F1", "Marty Supreme", "One Battle After Another", "Sentimental Value", "Sinners"]
    },
    {
        "name": "Best Production Design",
        "nominees": ["Frankenstein", "Hamnet", "Marty Supreme", "One Battle After Another", "Sinners"]
    },
    {
        "name": "Best Costume Design",
        "nominees": ["Avatar: Fire and Ash", "Frankenstein", "Hamnet", "Marty Supreme", "Sinners"]
    },
    {
        "name": "Best Makeup and Hairstyling",
        "nominees": ["Frankenstein", "Kokuho", "Sinners", "The Smashing Machine", "The Ugly Stepsister"]
    },
    {
        "name": "Best Sound",
        "nominees": ["F1", "Frankenstein", "One Battle After Another", "Sinners", "Sirāt"]
    },
    {
        "name": "Best Visual Effects",
        "nominees": ["Avatar: Fire and Ash", "F1", "Jurassic World Rebirth", "The Lost Bus", "Sinners"]
    },
    {
        "name": "Best Casting",
        "nominees": ["Hamnet — Nina Gold", "Marty Supreme — Jennifer Venditti", "One Battle After Another — Cassandra Kulukundis", "The Secret Agent — Gabriel Domingues", "Sinners — Francine Maisler"]
    }
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    db_dir = os.path.dirname(DB_PATH)
    logger.info(f"DB_PATH={DB_PATH}")
    logger.info(f"DB directory: {db_dir or '(current dir)'}")
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        logger.info(f"Directory exists: {os.path.isdir(db_dir)}")
        logger.info(f"Directory writable: {os.access(db_dir, os.W_OK)}")
        logger.info(f"Directory contents: {os.listdir(db_dir)}")
    db_existed = os.path.isfile(DB_PATH)
    logger.info(f"DB file already exists: {db_existed}")
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS picks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            rankings TEXT NOT NULL,
            locked INTEGER DEFAULT 0,
            FOREIGN KEY (player_id) REFERENCES players(id),
            UNIQUE(player_id, category)
        );
        CREATE TABLE IF NOT EXISTS winners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT UNIQUE NOT NULL,
            winner TEXT NOT NULL,
            announced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS previous_ranks (
            player_id INTEGER PRIMARY KEY,
            rank INTEGER NOT NULL,
            FOREIGN KEY (player_id) REFERENCES players(id)
        );
    """)
    conn.commit()
    player_count = conn.execute("SELECT COUNT(*) FROM players").fetchone()[0]
    logger.info(f"DB initialized — {player_count} existing players")
    logger.info(f"DB file size: {os.path.getsize(DB_PATH)} bytes")
    conn.close()
