import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from rag.pipeline import query_index, stream_query

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    session_id: str | None = None
    top_k: int = 5
    stream: bool = False

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query cannot be empty")
        if len(v) > 500:
            raise ValueError("query must be 500 characters or fewer")
        return v

    @field_validator("top_k")
    @classmethod
    def validate_top_k(cls, v: int) -> int:
        if v < 1 or v > 8:
            raise ValueError("top_k must be between 1 and 8")
        return v


@router.post("/")
async def run_query(body: QueryRequest):
    """
    Main RAG query endpoint.
    Called by the api-gateway after input is sanitized.
    Returns: { answer, sources, raw_context }
    """
    try:
        if body.stream:
            return StreamingResponse(
                _stream_events(body.query, body.top_k),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                },
            )

        result = query_index(query=body.query, top_k=body.top_k)
        return result
    except Exception as e:
        # Surface the error to gateway — do not silently swallow
        raise HTTPException(status_code=500, detail=str(e))


async def _stream_events(query: str, top_k: int):
    async for token in stream_query(query, top_k):
        yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
    yield "event: done\ndata: {}\n\n"
