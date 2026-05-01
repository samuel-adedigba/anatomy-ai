from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.query import router as query_router
from routes.health import router as health_router
from routes.ingest import router as ingest_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Anatomy AI — AI Service",
        description="RAG pipeline and LLM inference for anatomy queries",
        version="1.0.0",
    )

    # CORS — allow gateway only in production
    # TODO: verify — restrict origins before deploying outside local
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/health")
    app.include_router(query_router, prefix="/query")
    app.include_router(ingest_router, prefix="/ingest")

    return app
