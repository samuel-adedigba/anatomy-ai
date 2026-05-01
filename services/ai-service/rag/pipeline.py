import os
from typing import Optional
import lancedb
from llama_index.core import VectorStoreIndex, Settings, StorageContext
from llama_index.vector_stores.lancedb import LanceDBVectorStore
from llama_index.core.schema import NodeWithScore
from llm.config import get_llm, get_embed_model

LANCEDB_PATH = os.getenv("LANCEDB_PATH", "../../data/vector-db")
TABLE_NAME = "anatomy_knowledge"


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


def get_index() -> VectorStoreIndex:
    """Load the existing vector index from LanceDB."""
    _configure_settings()
    vector_store = _get_vector_store()
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        storage_context=storage_context,
    )


def query_index(query: str, top_k: int = 5) -> dict:
    """
    Run a RAG query against the anatomy knowledge index.
    Returns: { answer, sources, raw_context }
    """
    index = get_index()
    query_engine = index.as_query_engine(
        similarity_top_k=top_k,
        response_mode="compact",
    )

    response = query_engine.query(query)

    # Extract source nodes for citation grounding
    sources = _extract_sources(response.source_nodes)

    return {
        "answer": str(response),
        "sources": sources,
        # raw_context passed to instruction engine for visual command extraction
        "raw_context": _extract_raw_context(response.source_nodes),
    }


def _extract_sources(nodes: list[NodeWithScore]) -> list[dict]:
    """Build citation list from retrieved source nodes."""
    sources = []
    for node in nodes:
        meta = node.node.metadata or {}
        sources.append({
            "title": meta.get("title", "Unknown source"),
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
