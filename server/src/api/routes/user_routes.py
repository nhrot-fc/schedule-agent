from typing import Annotated

from fastapi import APIRouter, Depends

from api.dependencies.auth import get_current_user
from domain.entities.user import UserEntity

router = APIRouter()


@router.get("/me")
async def read_users_me(current_user: Annotated[UserEntity, Depends(get_current_user)]):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
    }
