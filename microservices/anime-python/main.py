import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import certifi

load_dotenv()

app = FastAPI(
    title="Jujutsu Kaisen API - Microservicio",
    description="""
## API REST para personajes de Jujutsu Kaisen

Este microservicio almacena y consulta información de **10 personajes** del anime **Jujutsu Kaisen**
en una base de datos no relacional **MongoDB Atlas**.

### Campos disponibles por personaje:
- **name**: Nombre del personaje
- **anime**: Anime al que pertenece
- **image_url**: URL de la imagen del personaje
- **technique**: Técnica maldita del personaje
- **domain_expansion**: Expansión de dominio (si tiene)
- **grade**: Grado de hechicero

### Tecnologías utilizadas:
- **FastAPI** (Python)
- **MongoDB Atlas** (Base de datos NoSQL en la nube)
- **Motor** (Driver asíncrono de MongoDB para Python)
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.getenv("MONGO_URL")
client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
db = client.anime_db
collection = db.characters

characters_data = [
    {"name": "Yuji Itadori", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/6/467646.jpg", "technique": "Divergent Fist", "domain_expansion": "Ninguno", "grade": "Grado Especial"},
    {"name": "Megumi Fushiguro", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/12/621887.jpg", "technique": "Técnica de las Diez Sombras", "domain_expansion": "Jardín de Sombras Quimera", "grade": "Grado 2"},
    {"name": "Nobara Kugisaki", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/12/422313.jpg", "technique": "Técnica del Muñeco de Paja", "domain_expansion": "Ninguno", "grade": "Grado 3"},
    {"name": "Satoru Gojo", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/15/422168.jpg", "technique": "Ilimitado (Limitless)", "domain_expansion": "Vacío Inconmensurable", "grade": "Grado Especial"},
    {"name": "Ryomen Sukuna", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/9/521637.jpg", "technique": "Desmantelar y Partir", "domain_expansion": "Relicario Demoníaco", "grade": "Grado Especial"},
    {"name": "Maki Zenin", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/11/521638.jpg", "technique": "Restricción Celestial", "domain_expansion": "Ninguno", "grade": "Grado 4"},
    {"name": "Toge Inumaki", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/4/521636.jpg", "technique": "Discurso Maldito", "domain_expansion": "Ninguno", "grade": "Semi-Grado 1"},
    {"name": "Panda", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/7/521639.jpg", "technique": "Núcleos de Cadáver Maldito", "domain_expansion": "Ninguno", "grade": "Grado 2"},
    {"name": "Kento Nanami", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/6/435400.jpg", "technique": "Técnica de Proporción", "domain_expansion": "Ninguno", "grade": "Grado 1"},
    {"name": "Suguru Geto", "anime": "Jujutsu Kaisen", "image_url": "https://cdn.myanimelist.net/images/characters/7/619361.jpg", "technique": "Manipulación de Espíritus Malditos", "domain_expansion": "Profusión del Vientre", "grade": "Grado Especial"}
]


class CharacterResponse(BaseModel):
    """Esquema de respuesta para un personaje de Jujutsu Kaisen"""
    name: str
    anime: str
    image_url: str
    technique: str
    domain_expansion: str
    grade: str

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Satoru Gojo",
                "anime": "Jujutsu Kaisen",
                "image_url": "https://cdn.myanimelist.net/images/characters/15/422168.jpg",
                "technique": "Ilimitado (Limitless)",
                "domain_expansion": "Vacío Inconmensurable",
                "grade": "Grado Especial"
            }
        }


class HealthResponse(BaseModel):
    """Esquema de respuesta para el estado del servicio"""
    status: str
    service: str
    database: str
    total_characters: int

    class Config:
        json_schema_extra = {
            "example": {
                "status": "ok",
                "service": "jujutsu-kaisen-api",
                "database": "MongoDB Atlas",
                "total_characters": 10
            }
        }


@app.on_event("startup")
async def startup_db_client():
    await collection.drop()
    await collection.insert_many(characters_data)


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Estado"],
    summary="Verificar estado del servicio",
    description="Retorna el estado actual del microservicio, la conexión a MongoDB y la cantidad de personajes almacenados."
)
async def health_check():
    count = await collection.count_documents({})
    return {
        "status": "ok",
        "service": "jujutsu-kaisen-api",
        "database": "MongoDB Atlas",
        "total_characters": count
    }


@app.get(
    "/characters",
    response_model=list[CharacterResponse],
    tags=["Personajes"],
    summary="Obtener todos los personajes",
    description="Retorna la lista completa de los 10 personajes de Jujutsu Kaisen almacenados en MongoDB, incluyendo nombre, técnica maldita, expansión de dominio y grado."
)
async def get_characters():
    chars = await collection.find({}, {"_id": 0}).to_list(100)
    return chars


@app.get(
    "/characters/search/{name}",
    response_model=list[CharacterResponse],
    tags=["Personajes"],
    summary="Buscar personaje por nombre",
    description="Busca personajes cuyo nombre coincida parcialmente con el término de búsqueda (no distingue mayúsculas/minúsculas)."
)
async def search_character(name: str):
    """
    - **name**: Nombre o parte del nombre del personaje a buscar (ej: 'gojo', 'yuji')
    """
    chars = await collection.find(
        {"name": {"$regex": name, "$options": "i"}},
        {"_id": 0}
    ).to_list(100)
    if not chars:
        raise HTTPException(status_code=404, detail=f"No se encontraron personajes con el nombre '{name}'")
    return chars


@app.get(
    "/characters/grade/{grade}",
    response_model=list[CharacterResponse],
    tags=["Personajes"],
    summary="Filtrar personajes por grado",
    description="Retorna todos los personajes que coincidan con el grado de hechicero indicado (ej: 'Grado Especial', 'Grado 1', 'Grado 2')."
)
async def get_by_grade(grade: str):
    """
    - **grade**: Grado del hechicero (ej: 'Especial', 'Grado 1', 'Grado 2')
    """
    chars = await collection.find(
        {"grade": {"$regex": grade, "$options": "i"}},
        {"_id": 0}
    ).to_list(100)
    if not chars:
        raise HTTPException(status_code=404, detail=f"No se encontraron personajes con el grado '{grade}'")
    return chars


@app.get(
    "/characters/with-domain",
    response_model=list[CharacterResponse],
    tags=["Personajes"],
    summary="Personajes con Expansión de Dominio",
    description="Retorna únicamente los personajes que poseen una Expansión de Dominio (excluye a los que tienen 'Ninguno')."
)
async def get_with_domain():
    chars = await collection.find(
        {"domain_expansion": {"$ne": "Ninguno"}},
        {"_id": 0}
    ).to_list(100)
    return chars
