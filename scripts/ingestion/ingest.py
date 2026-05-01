#!/usr/bin/env python3
"""
Standalone ingestion script.
Run this directly to index documents without starting the full ai-service.

Usage:
    python scripts/ingestion/ingest.py
    python scripts/ingestion/ingest.py --source ./data/raw-docs --db ./data/vector-db
"""

import argparse
import sys
import os

# Allow running from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../services/ai-service"))

from dotenv import load_dotenv
load_dotenv()

from rag.ingestion import ingest_documents


def main():
    parser = argparse.ArgumentParser(description="Ingest documents into Anatomy AI vector store")
    parser.add_argument("--source", default=None, help="Path to source documents directory")
    parser.add_argument("--db", default=None, help="Path to LanceDB storage directory")
    args = parser.parse_args()

    if args.db:
        os.environ["LANCEDB_PATH"] = args.db

    print(f"[ingest] Starting ingestion from: {args.source or os.getenv('RAW_DOCS_PATH', './data/raw-docs')}")

    result = ingest_documents(source_dir=args.source)

    print(f"[ingest] Result: {result}")


if __name__ == "__main__":
    main()
