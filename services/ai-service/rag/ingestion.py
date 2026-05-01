import os
from pathlib import Path
import lancedb
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext, Settings
from llama_index.vector_stores.lancedb import LanceDBVectorStore
from llm.config import get_llm, get_embed_model

LANCEDB_PATH = os.getenv("LANCEDB_PATH", "../../data/vector-db")
RAW_DOCS_PATH = os.getenv("RAW_DOCS_PATH", "../../data/raw-docs")
TABLE_NAME = "anatomy_knowledge"


def ingest_documents(source_dir: Optional[str] = None) -> dict:
    """
    Reads all documents from raw-docs/, chunks, embeds, and stores in LanceDB.
    Safe to re-run — LanceDB will append without duplicating if UUIDs are stable.
    TODO: verify — add deduplication by file hash before production use
    """
    docs_path = source_dir or RAW_DOCS_PATH

    if not Path(docs_path).exists():
        raise FileNotFoundError(f"Source directory not found: {docs_path}")

    # Configure local models
    Settings.llm = get_llm()
    Settings.embed_model = get_embed_model()
    Settings.chunk_size = 512
    Settings.chunk_overlap = 50

    # Load documents from directory — supports PDF, txt, md
    documents = SimpleDirectoryReader(
        input_dir=docs_path,
        recursive=True,
        required_exts=[".pdf", ".txt", ".md"],
    ).load_data()

    if not documents:
        return {"status": "no_documents", "count": 0}

    # Connect to LanceDB and build index
    db = lancedb.connect(LANCEDB_PATH)
    vector_store = LanceDBVectorStore(connection=db, table_name=TABLE_NAME)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        show_progress=True,
    )

    return {"status": "success", "indexed": len(documents)}


from typing import Optional
