#!/usr/bin/env python3
"""
Embedding smoke test.
Verifies Ollama embed model is reachable and produces vectors.

Usage:
    python scripts/embedding/test_embed.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../services/ai-service"))

from dotenv import load_dotenv
load_dotenv()

from llm.config import get_embed_model


def main():
    print("[embed-test] Loading embed model...")
    embed_model = get_embed_model()

    test_text = "The cerebral cortex is the outer layer of the brain responsible for higher cognitive functions."
    print(f"[embed-test] Embedding: '{test_text[:60]}...'")

    embedding = embed_model.get_text_embedding(test_text)

    print(f"[embed-test] ✅ Success — vector dimensions: {len(embedding)}")
    print(f"[embed-test] First 5 values: {embedding[:5]}")


if __name__ == "__main__":
    main()
