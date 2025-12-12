import os
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

def search_youtube_reviews(query: str):
    """
    Searches YouTube for video reviews using the official API.
    """
    api_key = os.environ.get("YOUTUBE_API_KEY")
    
    if not api_key:
        return "YouTube API Key is missing in .env."

    try:
        youtube = build('youtube', 'v3', developerKey=api_key)
        
        request = youtube.search().list(
            part="snippet",
            maxResults=3,
            q=f"{query} food review mumbai",
            type="video"
        )
        response = request.execute()
        
        videos = []
        for item in response.get('items', []):
            title = item['snippet']['title']
            video_id = item['id']['videoId']
            url = f"https://www.youtube.com/watch?v={video_id}"
            videos.append(f"🎥 {title} - {url}")
            
        return "\n".join(videos) if videos else "No video reviews found."
        
    except Exception as e:
        return f"YouTube API Error: {str(e)}"