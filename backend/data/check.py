import pandas as pd
import sqlite3
import os

def check_areas():
    print("--- INSPECTING AREAS ---")
    
    # OPTION 1: Check CSV (If you have it)
    if os.path.exists("zomato.csv"):
        print("\n📂 Found zomato.csv! Reading...")
        try:
            df = pd.read_csv("zomato.csv")
            # clean column names
            df.columns = [c.lower().strip() for c in df.columns]
            
            if 'area' in df.columns:
                areas = sorted(df['area'].dropna().unique())
                print(f"✅ Found {len(areas)} Unique Areas:")
                print("------------------------------------------------")
                for area in areas:
                    print(f"'{area}'")
                print("------------------------------------------------")
                return
            else:
                print("❌ 'area' column not found in CSV.")
        except Exception as e:
            print(f"❌ Error reading CSV: {e}")

    # OPTION 2: Check Database (If CSV is missing)
    db_path = "backend\restaurants.db" if os.path.exists("backend/restaurants.db") else "restaurants.db"
    
    if os.path.exists(db_path):
        print(f"\n📂 Found {db_path}! Querying...")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT area FROM restaurants ORDER BY area")
            rows = cursor.fetchall()
            conn.close()
            
            print(f"✅ Found {len(rows)} Unique Areas:")
            print("------------------------------------------------")
            for row in rows:
                print(f"'{row[0]}'")
            print("------------------------------------------------")
        except Exception as e:
            print(f"❌ Error reading DB: {e}")
    else:
        print("❌ Could not find zomato.csv or restaurants.db")

if __name__ == "__main__":
    check_areas()