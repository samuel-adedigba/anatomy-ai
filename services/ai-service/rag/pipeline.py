import os
from pathlib import Path
from typing import AsyncGenerator

import lancedb
from llama_index.core import (
    PromptTemplate,
    QueryBundle,
    Settings,
    StorageContext,
    VectorStoreIndex,
)
from llama_index.vector_stores.lancedb import LanceDBVectorStore
from llama_index.core.schema import NodeWithScore
from llm.config import get_llm, get_embed_model, normalize_embedding

LANCEDB_PATH = os.getenv("LANCEDB_PATH", "../../data/vector-db")
TABLE_NAME = os.getenv("LANCEDB_TABLE", "anatomy_knowledge_v3")
QUERY_PREFIX = "search_query: "
PROMPT_PATH = Path(__file__).resolve().parents[3] / "configs/prompts/anatomy_query.txt"


def _get_vector_store() -> LanceDBVectorStore:
    """Initialise LanceDB in embedded mode — no server needed."""
    db = lancedb.connect(LANCEDB_PATH)
    return LanceDBVectorStore(connection=db, table_name=TABLE_NAME)


def _configure_settings() -> None:
    """Set global LlamaIndex settings to local models."""
    Settings.llm = get_llm()
    Settings.embed_model = get_embed_model()
    # Keep chunk size small for CPU — reduces memory pressure per retrieval
    Settings.chunk_size = 512
    Settings.chunk_overlap = 50


def _table_has_data() -> bool:
    """Return whether the LanceDB knowledge table exists and contains rows."""
    try:
        db = lancedb.connect(LANCEDB_PATH)
        if TABLE_NAME not in db.table_names():
            return False
        return db.open_table(TABLE_NAME).count_rows() > 0
    except Exception:
        return False


def get_index() -> VectorStoreIndex:
    """Load the existing vector index from LanceDB."""
    _configure_settings()
    vector_store = _get_vector_store()
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        storage_context=storage_context,
    )


def _build_qa_template() -> PromptTemplate:
    return PromptTemplate(PROMPT_PATH.read_text(encoding="utf-8"))


def _build_query_bundle(query: str) -> QueryBundle:
    """Embed the prefixed query while preserving the user's text for the LLM."""
    embedding = Settings.embed_model.get_query_embedding(QUERY_PREFIX + query)
    return QueryBundle(query_str=query, embedding=normalize_embedding(embedding))


def query_index(query: str, top_k: int = 5) -> dict:
    """
    Run a RAG query against the anatomy knowledge index.
    Returns: { answer, sources, raw_context }

    If the knowledge base is empty, return an actionable setup message instead
    of asking LlamaIndex to query a table that does not exist yet.
    """
    if not _table_has_data():
        return {
            "answer": (
                "The anatomy knowledge base has not been populated yet. "
                "Please run ./scripts/ingest.sh from the repository root."
            ),
            "sources": [],
            "raw_context": "",
        }

    index = get_index()
    query_engine = index.as_query_engine(
        similarity_top_k=top_k,
        response_mode="compact",
        text_qa_template=_build_qa_template(),
    )

    response = query_engine.query(_build_query_bundle(query))

    # Extract source nodes for citation grounding
    sources = _extract_sources(response.source_nodes)

    return {
        "answer": str(response),
        "sources": sources,
        # raw_context passed to instruction engine for visual command extraction
        "raw_context": _extract_raw_context(response.source_nodes),
    }


async def stream_query(query: str, top_k: int = 5) -> AsyncGenerator[str, None]:
    """Yield answer tokens without blocking the FastAPI event loop."""
    if not _table_has_data():
        yield (
            "The anatomy knowledge base has not been populated yet. "
            "Please run ./scripts/ingest.sh from the repository root."
        )
        return

    index = get_index()
    query_engine = index.as_query_engine(
        similarity_top_k=top_k,
        response_mode="compact",
        streaming=True,
        text_qa_template=_build_qa_template(),
    )
    response = await query_engine.aquery(_build_query_bundle(query))
    async for token in response.async_response_gen():
        yield token


def _extract_sources(nodes: list[NodeWithScore]) -> list[dict]:
    """Build citation list from retrieved source nodes."""
    sources = []
    for node in nodes:
        meta = node.node.metadata or {}
        file_name = str(meta.get("file_name", ""))
        fallback_title = Path(file_name).stem.replace("-", " ").replace("_", " ").title()
        sources.append({
            "title": meta.get("title") or fallback_title or "Unknown source",
            "url": meta.get("url"),
            "snippet": node.node.get_content()[:300],
            "score": round(node.score or 0, 4),
        })
    return sources


def _extract_raw_context(nodes: list[NodeWithScore]) -> str:
    """Concatenate retrieved context chunks for instruction engine parsing."""
    return "\n\n".join(
        node.node.get_content() for node in nodes
    )
