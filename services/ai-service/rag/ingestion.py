import os
from pathlib import Path
from typing import Optional

import lancedb
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext, Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import MetadataMode
from llama_index.vector_stores.lancedb import LanceDBVectorStore
from llm.config import get_llm, get_embed_model, normalize_embedding

LANCEDB_PATH = os.getenv("LANCEDB_PATH", "../../data/vector-db")
RAW_DOCS_PATH = os.getenv("RAW_DOCS_PATH", "../../data/raw-docs")
TABLE_NAME = os.getenv("LANCEDB_TABLE", "anatomy_knowledge_v3")
DOCUMENT_PREFIX = "search_document: "


def _document_metadata(file_path: str) -> dict[str, str]:
    """Expose local document attribution without leaking absolute file paths."""
    path = Path(file_path)
    metadata = {
        "file_name": path.name,
        "title": path.stem.replace("-", " ").replace("_", " ").title(),
    }

    if path.suffix.lower() != ".md":
        return metadata

    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        return metadata

    for line in lines[1:]:
        if line.strip() == "---":
            break
        key, separator, value = line.partition(":")
        if separator and key.strip() in {"title", "url"}:
            metadata[key.strip()] = value.strip()

    return metadata


def ingest_documents(source_dir: Optional[str] = None) -> dict:
    """
    Reads all documents from raw-docs/, chunks, embeds, and stores in LanceDB.
    Safe to re-run: the complete table is rebuilt from the current source files.
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
        file_metadata=_document_metadata,
    ).load_data()

    if not documents:
        return {"status": "no_documents", "count": 0}

    splitter = SentenceSplitter(
        chunk_size=Settings.chunk_size,
        chunk_overlap=Settings.chunk_overlap,
    )
    nodes = splitter.get_nodes_from_documents(documents, show_progress=True)

    # nomic-embed-text uses asymmetric task prefixes. Embed each chunk with the
    # document prefix while keeping the stored text clean for citations and RAG.
    embedding_inputs = [
        DOCUMENT_PREFIX + node.get_content(metadata_mode=MetadataMode.EMBED)
        for node in nodes
    ]
    embeddings = Settings.embed_model.get_text_embedding_batch(
        embedding_inputs,
        show_progress=True,
    )
    for node, embedding in zip(nodes, embeddings):
        node.embedding = normalize_embedding(embedding)

    # Connect to LanceDB and build index
    db = lancedb.connect(LANCEDB_PATH)
    vector_store = LanceDBVectorStore(connection=db, table_name=TABLE_NAME)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    VectorStoreIndex(
        nodes,
        storage_context=storage_context,
        # LanceDB's overwrite mode replaces the table on each insertion batch.
        # Keep a full rebuild in one batch so larger corpora do not lose chunks.
        insert_batch_size=len(nodes),
        show_progress=True,
    )

    return {"status": "success", "indexed": len(documents)}
