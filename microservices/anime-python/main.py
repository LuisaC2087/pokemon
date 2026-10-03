import os
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Anime API",
    description="API for 10 Anime characters using MongoDB",
    version="1.0.0"
)

import certifi

MONGO_URL = os.getenv("MONGO_URL")
client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
db = client.anime_db
collection = db.characters

characters_data = [
    {"name": "Naruto Uzumaki", "anime": "Naruto", "image_url": "https://upload.wikimedia.org/wikipedia/en/9/9a/NarutoUzumaki.png"},
    {"name": "Goku", "anime": "Dragon Ball", "image_url": "https://upload.wikimedia.org/wikipedia/en/a/af/Son_Goku_YoungAdult.png"},
    {"name": "Monkey D. Luffy", "anime": "One Piece", "image_url": "https://upload.wikimedia.org/wikipedia/en/a/a4/Monkey_D._Luffy.png"},
    {"name": "Edward Elric", "anime": "Fullmetal Alchemist", "image_url": "https://upload.wikimedia.org/wikipedia/en/2/27/Edward_Elric_manga.jpg"},
    {"name": "Light Yagami", "anime": "Death Note", "image_url": "https://upload.wikimedia.org/wikipedia/en/0/0c/Light_Yagami_manga.jpg"},
    {"name": "Levi Ackerman", "anime": "Attack on Titan", "image_url": "https://upload.wikimedia.org/wikipedia/en/3/30/Levi_Ackerman_manga.jpg"},
    {"name": "Saitama", "anime": "One Punch Man", "image_url": "https://upload.wikimedia.org/wikipedia/en/c/c3/Saitama_manga.jpg"},
    {"name": "Gon Freecss", "anime": "Hunter x Hunter", "image_url": "https://upload.wikimedia.org/wikipedia/en/f/f2/Gon_Freecss_manga.jpg"},
    {"name": "Ichigo Kurosaki", "anime": "Bleach", "image_url": "https://upload.wikimedia.org/wikipedia/en/0/08/Ichigo_Kurosaki_manga.jpg"},
    {"name": "Gojo Satoru", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/c/c5/Gojo_Satoru_manga.jpg"}
]

@app.on_event("startup")
async def startup_db_client():
    count = await collection.count_documents({})
    if count == 0:
        await collection.insert_many(characters_data)

@app.get("/characters", tags=["Characters"])
async def get_characters():
    """
    Get all 10 anime characters
    """
    chars = await collection.find({}, {"_id": 0}).to_list(100)
    return chars
