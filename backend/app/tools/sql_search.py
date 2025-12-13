import os
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

def get_llm():
    return ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)

def get_db_connection():
    try:
        return psycopg2.connect(SUPABASE_URL, cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"❌ DB Error: {e}")
        return None

def get_coordinates(address: str):
    if not GOOGLE_API_KEY: return None
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        response = requests.get(url, params={"address": address, "key": GOOGLE_API_KEY})
        if response.json()['status'] == 'OK':
            loc = response.json()['results'][0]['geometry']['location']
            return {"lat": loc['lat'], "lng": loc['lng']}
    except: return None

# --- TOOL 1: SPECIFIC LOOKUP ---
def run_sql_check(user_query: str):
    llm = get_llm()
    system_prompt = """
    You are a Postgres Expert. Table: restaurants.
    Schema: name, area, rating, cost, url.
    Rules: SELECT name, area, rating, cost, url FROM restaurants. Use ILIKE. LIMIT 1. Raw SQL only.
    """
    try:
        response = llm.invoke([("system", system_prompt), ("human", user_query)])
        sql = response.content.replace("```sql", "").replace("```", "").strip()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(sql)
        row = cursor.fetchone()
        conn.close()
        
        if not row: return None, "No specific match found.", None
        
        coords = get_coordinates(f"{row['name']}, {row['area']}, Mumbai")
        return row.get('url'), str(dict(row)), coords
    except Exception as e:
        return None, str(e), None

# --- TOOL 2: SEMANTIC/FUZZY SEARCH (UPDATED) ---
def run_semantic_proxy(query: str):
    """
    Uses Postgres Trigrams (Fuzzy Match) if available, falling back to ILIKE.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # FUZZY SEARCH QUERY
        # ordering by similarity to find the best typo match
        sql = """
        SELECT name, area, cuisine, rating, 
               similarity(name, %s) as sim_score
        FROM restaurants 
        WHERE name % %s 
           OR cuisine ILIKE %s 
           OR area ILIKE %s
        ORDER BY sim_score DESC, rating DESC
        LIMIT 4
        """
        term = query
        wildcard = f"%{query}%"
        
        # We try to execute the fuzzy search
        try:
            cursor.execute(sql, (term, term, wildcard, wildcard))
        except psycopg2.errors.UndefinedFunction:
            # Fallback if pg_trgm extension is missing
            conn.rollback()
            sql_fallback = "SELECT name, area, cuisine, rating FROM restaurants WHERE name ILIKE %s OR cuisine ILIKE %s OR area ILIKE %s ORDER BY rating DESC LIMIT 4"
            cursor.execute(sql_fallback, (wildcard, wildcard, wildcard))

        rows = cursor.fetchall()
        conn.close()

        if not rows: return "No matches found in DB."
        return "\n".join([f"• {r['name']} ({r['area']}) | {r['cuisine']} | {r['rating']}⭐" for r in rows])
    except Exception as e:
        return f"Search Error: {e}"

# --- TOOL 3: STATS ---
def run_sql_stats(user_query: str):
    llm = get_llm()
    prompt = "Select name, area, rating, cost FROM restaurants. Use ILIKE. ORDER BY rating DESC. LIMIT 5. Raw SQL."
    try:
        resp = llm.invoke([("system", prompt), ("human", user_query)])
        sql = resp.content.replace("```sql", "").replace("```", "").strip()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(sql)
        rows = cur.fetchall()
        conn.close()
        return "\n".join([f"• {r['name']} ({r['area']}) - {r['rating']}⭐" for r in rows]) if rows else "No data."
    except Exception as e: return str(e)

# --- DIRECT LOOKUP ---
def query_db_for_name_direct(name: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM restaurants WHERE name ILIKE %s LIMIT 1", (f"%{name}%",))
        row = cur.fetchone()
        conn.close()
        return f"FOUND: {row['name']}" if row else None
    except: return None

# --- SUGGESTIONS ---
def get_restaurant_suggestions(query: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT name, area FROM restaurants WHERE name ILIKE %s LIMIT 3", (f"%{query}%",))
        rows = cur.fetchall()
        conn.close()
        return [{"name": r["name"], "area": r["area"], "coordinates": get_coordinates(f"{r['name']}, {r['area']}, Mumbai")} for r in rows]
    except: return []