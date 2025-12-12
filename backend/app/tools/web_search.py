import os
from dotenv import load_dotenv
# --- REVERTED IMPORT ---
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_community.tools import DuckDuckGoSearchRun

load_dotenv()

def run_web_check(user_query: str):
    """
    Step 3: General Web Search (Reddit/Blogs) with Fallback
    """
    tavily_key = os.environ.get("TAVILY_API_KEY")
    
    # Priority 1: Tavily
    if tavily_key:
        try:
            print(f"DEBUG: Running Tavily Search for {user_query}...")
            tool = TavilySearchResults(max_results=3)
            results = tool.invoke({"query": f"{user_query} reviews reddit mumbai"})
            
            if isinstance(results, list):
                formatted = [f"- {res.get('content', 'No content')} ({res.get('url', 'No URL')})" for res in results]
                return "\n".join(formatted)
            else:
                return str(results)
                
        except Exception as e:
            print(f"WARNING: Tavily failed ({e}). Switching to DuckDuckGo.")
    
    # Priority 2: DuckDuckGo (Fallback)
    try:
        print(f"DEBUG: Running DuckDuckGo Search for {user_query}...")
        ddg = DuckDuckGoSearchRun()
        query = f"site:reddit.com/r/mumbai {user_query} review"
        return ddg.invoke(query)
    except Exception as e:
        return f"Web Search Error (Both providers failed): {str(e)}"