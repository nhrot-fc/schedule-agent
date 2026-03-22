from fastapi import APIRouter

from api.routes import health_routes

router = APIRouter()

router.include_router(router=health_routes.router, prefix="/healthz", tags=["Health"])
