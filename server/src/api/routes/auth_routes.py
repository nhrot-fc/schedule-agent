from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from data.repositories.user_repository import UserRepository
from domain.services.user_service import UserService
from domain.third_party.google_service import get_google_flow
from infrastructure.database import get_db

router = APIRouter()


@router.get("/login", response_class=RedirectResponse)
async def login() -> Response:
    flow = get_google_flow()
    authorization_url, _state = flow.authorization_url(
        access_type="offline", include_granted_scopes="true", prompt="consent"
    )
    response = RedirectResponse(url=authorization_url)
    response.set_cookie(
        key="code_verifier",
        value=flow.code_verifier or "",
        httponly=True,
        max_age=300,
        samesite="lax",
    )
    return response


@router.get("/callback", response_class=RedirectResponse)
async def auth_callback(
    request: Request,
    code: Annotated[str, Query(...)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        code_verifier = request.cookies.get("code_verifier")
        if not code_verifier:
            raise ValueError("Sesión expirada. Intenta iniciar sesión de nuevo.")

        user_repo = UserRepository(db)
        user_service = UserService(user_repo)

        app_token = user_service.authenticate_google_user(code, code_verifier)

        # 4. Redirigir a React
        response = RedirectResponse(
            url=f"http://localhost:5173/dashboard?token={app_token}"
        )
        response.delete_cookie(key="code_verifier")
        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
