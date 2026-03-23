from fastapi import APIRouter

from api.routes import auth_routes, calendar_routes, health_routes, user_routes

router = APIRouter()

router.include_router(router=health_routes.router, prefix="/healthz", tags=["Health"])
router.include_router(router=auth_routes.router, prefix="/auth", tags=["Auth"])
router.include_router(router=user_routes.router, prefix="/users", tags=["Users"])
router.include_router(
    router=calendar_routes.router, prefix="/calendar", tags=["Calendar"]
)
