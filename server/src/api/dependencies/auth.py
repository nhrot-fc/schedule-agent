from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from data.repositories.user_repository import UserRepository
from domain.entities.user import UserEntity
from domain.services.user_service import UserService
from infrastructure.config import settings
from infrastructure.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> UserEntity:
    """Verifica el JWT de la app y devuelve el usuario de la base de datos."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception as e:
        raise credentials_exception from e

    try:
        user_repo = UserRepository(db)
        user_service = UserService(user_repo)
        user = user_service.get_user_by_id(int(user_id))
    except (ValueError, TypeError) as e:
        raise credentials_exception from e

    return user
