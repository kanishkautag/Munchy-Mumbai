import sqlite3
import os
import requests # <--- Needed for Google API
import chromadb
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

# --- SETUP 1: ROBUST PATHS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "..", "restaurants.db")

CHROMA_PATH = os.path.join(BASE_DIR, "..", "..", "chroma_db")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH) 
collection = chroma_client.get_collection("restaurants")

# --- SETUP 2: GOOGLE GEOCODING (The Fix) ---
# We use the same key you used for YouTube
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

def get_llm():
    return ChatGroq(model="llama-3.3-70b-versatile", api_key=os.environ.get("GROQ_API_KEY"))

def get_db_connection():
    if not os.path.exists(DB_PATH):
        return None
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_coordinates(address: str):
    """
    Uses Google Maps Geocoding API for 100% reliable coordinates.
    """
    if not GOOGLE_API_KEY:
        print("❌ ERROR: GOOGLE_API_KEY is missing in .env")
        return None

    try:
        # Google Maps Geocoding Endpoint
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": address,
            "key": GOOGLE_API_KEY
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if data['status'] == 'OK':
            location = data['results'][0]['geometry']['location']
            print(f"✅ Found Coords for {address}: {location}")
            return {"lat": location['lat'], "lng": location['lng']}
        else:
            print(f"⚠️ Google Geo Error: {data['status']}")
            return None
            
    except Exception as e:
        print(f"Geocoding Exception: {e}")
        return None

# --- SHARED PROMPTS ---
AREA_MAPPING_PROMPT = """
CRITICAL DATABASE RULES FOR 'AREA' COLUMN:
1. ALWAYS use 'LIKE' with wildcards (e.g. area LIKE '%Bandra%').
2. HANDLE SLANG:
   - "BKC" -> area LIKE '%Bandra Kurla Complex%'
   - "Town"/"SoBo" -> area IN ('Fort', 'Colaba', 'Churchgate', 'Nariman Point')
"""

ESCAPE_RULE = """
CRITICAL SQL SYNTAX RULE:
- If search term has apostrophe (e.g. "Joey's"), DOUBLE IT: "Joey''s"
"""

# --- TOOL 1: SPECIFIC LOOKUP ---
def run_sql_check(user_query: str):
    llm = get_llm()
    system_prompt = f"""
    You are a SQL Expert. Convert user request to SQL for 'restaurants' table.
    Schema: name, cuisine, area, rating, cost, url.
    {ESCAPE_RULE}
    {AREA_MAPPING_PROMPT}
    Rules: SELECT name, area, rating, cost, url. Use LIKE. LIMIT 1. Return ONLY raw SQL.
    """
    try:
        response = llm.invoke([("system", system_prompt), ("human", f"Query: {user_query}")])
        sql_query = response.content.replace("```sql", "").replace("```", "").strip()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(sql_query)
        rows = cursor.fetchall()
        conn.close()
        
        if not rows: return None, "Local DB: No match found.", None
            
        first_row = dict(rows[0])
        found_url = next((first_row[k] for k in first_row if k.lower() == 'url'), None)
        
        # Get Map Coordinates using Google API
        map_search_str = f"{first_row.get('name')}, {first_row.get('area')}, Mumbai"
        coords = get_coordinates(map_search_str)

        return found_url, str(first_row), coords
    except Exception as e:
        return None, f"Local DB Error: {str(e)}", None

# --- TOOL 2: STATS / LISTS ---
def run_sql_stats(user_query: str):
    llm = get_llm()
    system_prompt = f"""
    You are a SQL Expert. Convert request to SQL.
    Schema: name, cuisine, area, rating, cost.
    {ESCAPE_RULE}
    {AREA_MAPPING_PROMPT}
    Rules: Select name, area, rating, cost. ORDER BY rating DESC. LIMIT 5. Return ONLY raw SQL.
    """
    try:
        response = llm.invoke([("system", system_prompt), ("human", user_query)])
        sql_query = response.content.replace("```sql", "").replace("```", "").strip()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(sql_query)
        rows = cursor.fetchall()
        conn.close()
        
        if not rows: return "No restaurants found."
        
        results = []
        for r in rows:
            results.append(f"• {r['name']} ({r['area']}) - {r['rating']}⭐ | ₹{r['cost']}")
        return "\n".join(results)
    except Exception as e:
        return f"Stats SQL Error: {e}"

# --- TOOL 3: RAG SEARCH ---
def run_rag_search(query: str):
    try:
        results = collection.query(query_texts=[query], n_results=3)
        output = []
        if results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                meta = results['metadatas'][0][i]
                output.append(f"• {meta['name']} ({meta['area']}): {doc[:150]}...")
        return "\n".join(output) if output else "No vector matches found."
    except Exception as e:
        return f"RAG Error: {e}"

# --- TOOL 4: DIRECT LOOKUP ---
def query_db_for_name_direct(restaurant_name: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM restaurants WHERE name LIKE ? LIMIT 1", (f"%{restaurant_name}%",))
        rows = cursor.fetchall()
        conn.close()
        if rows:
            row = dict(rows[0])
            return f"FOUND IN DB: {row['name']} | Rating: {row.get('rating')} | Cost: {row.get('cost')}"
        return None
    except:
        return None

# --- TOOL 5: SUGGESTIONS ---
def get_restaurant_suggestions(query: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name, area FROM restaurants WHERE name LIKE ? LIMIT 3", (f"%{query}%",))
        rows = cursor.fetchall()
        conn.close()
        
        suggestions = []
        for r in rows:
            search_str = f"{r['name']}, {r['area']}, Mumbai"
            coords = get_coordinates(search_str) # Google API Call
            
            suggestions.append({
                "name": r["name"], 
                "area": r["area"],
                "coordinates": coords
            })
        return suggestions
    except Exception as e:
        print(f"Suggestion Error: {e}")
        return []