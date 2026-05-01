import os
import httpx
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def health() -> dict:
    """Health check — also pings Ollama to confirm local model is reachable."""
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_ok = False

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{ollama_url}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass

    return {
        "status": "ok",
        "service": "ai-service",
        "ollama_reachable": ollama_ok,
        "model": os.getenv("OLLAMA_MODEL", "llama3.2:3b"),
    }
