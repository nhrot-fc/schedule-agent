from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.router import router
from infrastructure.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.include_router(router, prefix="/api/v1")
    return app


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
