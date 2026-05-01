from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from rag.pipeline import query_index

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    session_id: str | None = None
    top_k: int = 5

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query cannot be empty")
        if len(v) > 500:
            raise ValueError("query must be 500 characters or fewer")
        return v


@router.post("/")
async def run_query(body: QueryRequest) -> dict:
    """
    Main RAG query endpoint.
    Called by the api-gateway after input is sanitized.
    Returns: { answer, sources, raw_context }
    """
    try:
        result = query_index(query=body.query, top_k=body.top_k)
        return result
    except Exception as e:
        # Surface the error to gateway — do not silently swallow
        raise HTTPException(status_code=500, detail=str(e))
