from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from rag.ingestion import ingest_documents

router = APIRouter()


class IngestRequest(BaseModel):
    source_dir: str | None = None


@router.post("/")
async def trigger_ingestion(body: IngestRequest = IngestRequest()) -> dict:
    """
    Triggers document ingestion into the vector store.
    Reads from data/raw-docs/ by default.
    TODO: caution — add auth token before exposing to any non-local network
    """
    try:
        result = ingest_documents(source_dir=body.source_dir)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
