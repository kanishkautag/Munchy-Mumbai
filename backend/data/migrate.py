import sqlite3
import csv
import os

# CONFIG
DB_PATH = "restaurants.db"
CSV_PATH = "restaurants.csv"

def export_to_csv():
    if not os.path.exists(DB_PATH):
        print(f"❌ Error: {DB_PATH} not found.")
        return

    print(f"📂 Reading {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Select all data
    try:
        cursor.execute("SELECT name, cuisine, area, rating, cost, votes, url FROM restaurants")
        rows = cursor.fetchall()
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return

    if not rows:
        print("⚠️ No data found.")
        return

    print(f"📝 Writing {len(rows)} rows to {CSV_PATH}...")
    
    with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # Write Header
        writer.writerow(['name', 'cuisine', 'area', 'rating', 'cost', 'votes', 'url'])
        # Write Data
        writer.writerows(rows)

    print(f"✅ Success! Data exported to {CSV_PATH}")
    conn.close()

if __name__ == "__main__":
    export_to_csv()