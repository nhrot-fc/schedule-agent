from contextlib import asynccontextmanager

from fastapi import FastAPI

from infrastructure.config import settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
