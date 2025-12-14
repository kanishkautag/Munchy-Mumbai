# 🍛 Munchy Mumbai AI

Munchy Mumbai AI is an advanced multi agent food discovery platform built to navigate Mumbai’s culinary landscape with high precision and zero hallucinations. Unlike generic chat systems, it follows a stateless RAG driven architecture with a dedicated Verifier Node that ensures every answer is fully grounded in real data.

The system focuses on correctness first, using structured databases, live web signals, and media content to generate reliable food recommendations across the city.

## 🌐 Live Demo

Frontend  
https://munchy-mumbai.vercel.app/
## 📸 Interface

### 1. Interactive Dashboard
A split screen layout with Neural Chat on the left and a real time Context Map on the right.

Add screenshot of the dashboard showing chat and map here

### 2. Multi Source Intelligence
The platform aggregates information from structured SQL data, live web reviews, and YouTube food vlogs in parallel.

Add screenshot of related media or inspector deck here

## 🏗️ Architecture Overview

This system avoids the generalist agent pattern by routing queries through specialized agents using a LangGraph based orchestration layer.

High level flow  
1. User sends a query  
2. Intent Router classifies the request  
3. Specialized agent handles the query type  
4. Verifier Node validates all facts against the database  
5. Synthesizer model generates the final response  

## 🏗️ Architecture

<img src="architecture.png" alt="Munchy Mumbai AI Architecture" width="100%" />

This architecture uses a LangGraph based multi agent routing system with a deterministic verifier layer to guarantee fully grounded responses and prevent location or branch hallucinations.

### Agent Types

Specific Agent  
Handles direct restaurant queries  

Stats Agent  
Handles best of lists and rankings  

Discovery Agent  
Handles vibes based and exploratory queries  

General Agent  
Handles greetings and casual queries  

### Core Components

Router Node  
Classifies intent early to reduce token usage  

Verifier Node  
A deterministic Python layer that cross checks web results with the SQL database to prevent location hallucinations such as suggesting branches that do not exist in Mumbai  

Fuzzy Search Layer  
Uses PostgreSQL trigram search in Supabase to handle typos more effectively than pure vector search  

## 🛠️ Tech Stack

### Frontend
Hosting on Vercel  
Framework React with Vite  
Styling Tailwind CSS with Framer Motion  
Maps React Leaflet with CartoDB Dark Matter tiles  
State Fully stateless with history passed via API  

### Backend
Hosting on Hugging Face Spaces  
API FastAPI with Python  
Orchestration LangChain and LangGraph  
Database Supabase using PostgreSQL  
Models Llama 3 seventy billion via Groq  

### External Tools
Tavily for live web scraping  
Google Maps API for precise geocoding  
YouTube Data API for food vlog discovery  

## 🚀 Getting Started Locally

### Prerequisites
Node.js version eighteen or higher  
Python version three point ten or higher  
Docker optional  

### 1. Clone the Repository
Clone the repository from GitHub and navigate into the project directory.

### 2. Backend Setup
Navigate to the backend folder  
Create a virtual environment  
Activate the environment  
Install dependencies from requirements file  

Create an environment file inside the backend folder with the following keys  
GROQ_API_KEY  
SUPABASE_URL  
GOOGLE_API_KEY  
TAVILY_API_KEY  

Start the FastAPI server using the main application entry point.

### 3. Frontend Setup
Navigate to the frontend folder  
Install dependencies  
Start the development server  

Open the local development URL in your browser to view the app.

## ☁️ Deployment

### Backend Deployment
The backend runs inside a Docker container on Hugging Face Spaces using the free tier.  
Secrets are managed directly from the Space settings.

### Frontend Deployment
The frontend is deployed as a static React site on Vercel.  
The API base URL points to the Hugging Face backend.  
Client side routing is handled via Vercel rewrites.

## 🔮 Future Roadmap

Voice based food discovery and ordering  
User accounts with saved favorites in Supabase  
Multimodal search using food images to find matching restaurants  

---

Built for accuracy first food discovery in Mumbai.
