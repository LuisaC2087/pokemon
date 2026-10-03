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
    {"name": "Yuji Itadori", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/6/467540.jpg", "technique": "Divergent Fist", "domain_expansion": "Ninguno", "grade": "Grado Especial"},
    {"name": "Megumi Fushiguro", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/2/467541.jpg", "technique": "Técnica de las Diez Sombras", "domain_expansion": "Jardín de Sombras Quimera", "grade": "Grado 2"},
    {"name": "Nobara Kugisaki", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/16/467542.jpg", "technique": "Técnica del Muñeco de Paja", "domain_expansion": "Ninguno", "grade": "Grado 3"},
    {"name": "Satoru Gojo", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/15/422168.jpg", "technique": "Ilimitado (Limitless)", "domain_expansion": "Vacío Inconmensurable", "grade": "Grado Especial"},
    {"name": "Ryomen Sukuna", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/4/467543.jpg", "technique": "Desmantelar y Partir", "domain_expansion": "Relicario Demoníaco", "grade": "Grado Especial"},
    {"name": "Maki Zenin", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/14/422171.jpg", "technique": "Restricción Celestial", "domain_expansion": "Ninguno", "grade": "Grado 4"},
    {"name": "Toge Inumaki", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/3/422172.jpg", "technique": "Discurso Maldito", "domain_expansion": "Ninguno", "grade": "Semi-Grado 1"},
    {"name": "Panda", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/10/422174.jpg", "technique": "Núcleos de Cadáver Maldito", "domain_expansion": "Ninguno", "grade": "Grado 2"},
    {"name": "Kento Nanami", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/13/422175.jpg", "technique": "Técnica de Proporción", "domain_expansion": "Ninguno", "grade": "Grado 1"},
    {"name": "Suguru Geto", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/2/422176.jpg", "technique": "Manipulación de Espíritus Malditos", "domain_expansion": "Profusión del Vientre", "grade": "Grado Especial"}
]

@app.on_event("startup")
async def startup_db_client():
    await collection.drop()
    await collection.insert_many(characters_data)

@app.get("/characters", tags=["Characters"])
async def get_characters():
    """
    Get all 10 anime characters
    """
    chars = await collection.find({}, {"_id": 0}).to_list(100)
    return chars
