import pandas as pd
import chromadb
import sqlite3
from langchain_text_splitters import RecursiveCharacterTextSplitter
from chromadb.utils import embedding_functions
import os

# --- PART 1: LOAD & CLEAN DATA ---
print("Loading CSV...")
# Adjust sep='|' if your file still uses pipes, otherwise sep=','
try:
    df = pd.read_csv("zomato.csv", sep='|') 
except:
    df = pd.read_csv("zomato.csv") # Fallback to comma

# Rename for consistency
df = df.rename(columns={
    "NAME": "name", "PRICE": "cost", "CUSINE_CATEGORY": "cuisine",
    "REGION": "area", "RATING": "rating", "VOTES": "votes"
})

# Clean numeric fields for SQL
df['cost'] = df['cost'].astype(str).str.replace(',', '').str.extract('(\d+)').astype(float).fillna(0)
df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0)

# --- PART 2: CREATE SQL DATABASE (For Text-to-SQL) ---
print("Creating SQLite DB for structured search...")
conn = sqlite3.connect("restaurants.db")
df.to_sql("restaurants", conn, if_exists="replace", index=False)
conn.close()
print("✅ SQL Database created: restaurants.db")

# --- PART 3: CREATE VECTOR STORE (For RAG) ---
print("Creating ChromaDB for Semantic Search...")
client = chromadb.PersistentClient(path="./chroma_db")
try:
    client.delete_collection("restaurants")
except:
    pass
collection = client.get_or_create_collection("restaurants")

# Setup Recursive Splitter (The "Smart" chunking you asked for)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""]
)

# Convert rows to text blobs
documents = []
metadatas = []
ids = []

for idx, row in df.iterrows():
    # We combine important text fields for the RAG search
    content = f"{row['name']} is a {row['cuisine']} restaurant in {row['area']}. It is known for {row['cuisine']} food."
    
    # Recursive split (overkill for short text, but good practice for your request)
    chunks = text_splitter.split_text(content)
    
    for i, chunk in enumerate(chunks):
        documents.append(chunk)
        metadatas.append({
            "name": str(row['name']),
            "rating": float(row['rating']),
            "cost": float(row['cost']),
            "area": str(row['area'])
        })
        ids.append(f"{idx}_{i}")

# Add to Chroma in batches
batch_size = 500
for i in range(0, len(documents), batch_size):
    collection.add(
        documents=documents[i:i+batch_size],
        metadatas=metadatas[i:i+batch_size],
        ids=ids[i:i+batch_size]
    )
    print(f"Chroma Batch {i} done...")

print("✅ RAG Vector Store created: ./chroma_db")