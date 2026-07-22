import os
from math import sqrt

from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding

# Target: 3B–7B model running locally via Ollama
# Optimised for CPU + 16GB RAM — do not increase context window beyond 4096
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")


def normalize_embedding(embedding: list[float]) -> list[float]:
    """Normalize vectors so LanceDB L2 search behaves like cosine similarity."""
    magnitude = sqrt(sum(value * value for value in embedding))
    if magnitude == 0:
        return embedding
    return [value / magnitude for value in embedding]


def get_llm() -> Ollama:
    """Returns the local LLM instance. Stateless — safe to call per request."""
    return Ollama(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        request_timeout=120.0,
        context_window=4096,
        temperature=0.2,
    )


def get_embed_model() -> OllamaEmbedding:
    """Returns the local embedding model for indexing and retrieval."""
    return OllamaEmbedding(
        model_name=EMBED_MODEL,
        base_url=OLLAMA_BASE_URL,
    )
