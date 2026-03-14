"""
CLI tool to add fake winner announcements to the mock live blog.

Usage:
    python -m bot.test.announce                  # Interactive — pick from a menu
    python -m bot.test.announce "Best Picture"   # Announce a random winner for that category
"""

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))
from database import CATEGORIES

ENTRIES_FILE = Path(__file__).parent / "entries.json"

# Different phrasings to test Claude's extraction robustness
TEMPLATES = [
    "And the Oscar for {category} goes to... {winner}!",
    "WINNER: {category} — {winner}",
    "The award for {category} has been presented to {winner}.",
    "{winner} wins the Oscar for {category}!",
    "Breaking: {winner} takes home {category} at the 98th Academy Awards.",
]


def load_entries() -> list[str]:
    if ENTRIES_FILE.exists():
        return json.loads(ENTRIES_FILE.read_text())
    return []


def save_entries(entries: list[str]):
    ENTRIES_FILE.write_text(json.dumps(entries, indent=2))


def add_entry(text: str):
    entries = load_entries()
    entries.append(text)
    save_entries(entries)
    print(f"  Added: {text}")


def pick_interactive():
    print("\nCategories:")
    for i, cat in enumerate(CATEGORIES):
        print(f"  {i + 1:2d}. {cat['name']}")

    print(f"\n   0. Add custom text")
    print(f"   q. Quit\n")

    choice = input("Pick a category number: ").strip()

    if choice.lower() == "q":
        sys.exit(0)

    if choice == "0":
        text = input("Enter custom blog text: ").strip()
        if text:
            add_entry(text)
        return

    try:
        idx = int(choice) - 1
        cat = CATEGORIES[idx]
    except (ValueError, IndexError):
        print("Invalid choice.")
        return

    print(f"\n  Nominees for {cat['name']}:")
    for j, nom in enumerate(cat["nominees"]):
        print(f"    {j + 1}. {nom}")
    print(f"    r. Random")

    nom_choice = input("\n  Pick a nominee: ").strip()

    if nom_choice.lower() == "r":
        winner = random.choice(cat["nominees"])
    else:
        try:
            winner = cat["nominees"][int(nom_choice) - 1]
        except (ValueError, IndexError):
            print("Invalid choice.")
            return

    template = random.choice(TEMPLATES)
    text = template.format(category=cat["name"], winner=winner)
    add_entry(text)


def announce_category(category_name: str):
    cat = next((c for c in CATEGORIES if c["name"].lower() == category_name.lower()), None)
    if not cat:
        print(f"Unknown category: {category_name}")
        print(f"Available: {', '.join(c['name'] for c in CATEGORIES)}")
        sys.exit(1)

    winner = random.choice(cat["nominees"])
    template = random.choice(TEMPLATES)
    text = template.format(category=cat["name"], winner=winner)
    add_entry(text)


def main():
    if not ENTRIES_FILE.exists():
        save_entries([])

    if len(sys.argv) > 1:
        announce_category(" ".join(sys.argv[1:]))
    else:
        while True:
            try:
                pick_interactive()
            except KeyboardInterrupt:
                print("\nDone.")
                break


if __name__ == "__main__":
    main()
