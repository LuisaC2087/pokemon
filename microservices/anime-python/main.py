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
    {"name": "Yuji Itadori", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/e/e0/Yuji_Itadori.png", "technique": "Divergent Fist", "domain_expansion": "Ninguno", "grade": "Grado Especial"},
    {"name": "Megumi Fushiguro", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/2/23/Megumi_Fushiguro.png", "technique": "Técnica de las Diez Sombras", "domain_expansion": "Jardín de Sombras Quimera", "grade": "Grado 2"},
    {"name": "Nobara Kugisaki", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/3/30/Nobara_Kugisaki.png", "technique": "Técnica del Muñeco de Paja", "domain_expansion": "Ninguno", "grade": "Grado 3"},
    {"name": "Satoru Gojo", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/c/c5/Gojo_Satoru_manga.jpg", "technique": "Ilimitado (Limitless)", "domain_expansion": "Vacío Inconmensurable", "grade": "Grado Especial"},
    {"name": "Ryomen Sukuna", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/9/90/Ryomen_Sukuna.png", "technique": "Desmantelar y Partir", "domain_expansion": "Relicario Demoníaco", "grade": "Grado Especial"},
    {"name": "Maki Zenin", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/f/f6/Maki_Zenin.png", "technique": "Restricción Celestial", "domain_expansion": "Ninguno", "grade": "Grado 4"},
    {"name": "Toge Inumaki", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/7/7b/Toge_Inumaki.png", "technique": "Discurso Maldito", "domain_expansion": "Ninguno", "grade": "Semi-Grado 1"},
    {"name": "Panda", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/3/3c/Panda_JJK.png", "technique": "Núcleos de Cadáver Maldito", "domain_expansion": "Ninguno", "grade": "Grado 2"},
    {"name": "Kento Nanami", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/0/06/Kento_Nanami.png", "technique": "Técnica de Proporción", "domain_expansion": "Ninguno", "grade": "Grado 1"},
    {"name": "Suguru Geto", "anime": "Jujutsu Kaisen", "image_url": "https://upload.wikimedia.org/wikipedia/en/9/9b/Suguru_Geto.png", "technique": "Manipulación de Espíritus Malditos", "domain_expansion": "Profusión del Vientre", "grade": "Grado Especial"}
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
