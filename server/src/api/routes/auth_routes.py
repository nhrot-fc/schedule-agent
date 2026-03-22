from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from google.oauth2.credentials import Credentials

from domain.third_party.google_service import create_ephemeral_token, get_google_flow

router = APIRouter()


@router.get("/login", response_class=RedirectResponse)
async def login() -> RedirectResponse:
    """
    Generates the Google OAuth consent screen authorization URL
    and redirects the user to it.

    Returns:
        RedirectResponse: Redirection to the authorization URL.
    """
    flow = get_google_flow()
    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return RedirectResponse(url=authorization_url)


@router.get("/callback", response_class=RedirectResponse)
async def auth_callback(code: str = Query(...)) -> RedirectResponse:
    """
    Handles the Google redirect, fetches the access token, generates
    an encrypted session token, and redirects back to the frontend.

    Args:
        code (str): The authorization code returned by Google.

    Returns:
        RedirectResponse: Redirection to the frontend dashboard containing
            the generated session token.

    Raises:
        HTTPException: Raised if the OAuth process fails or the token
            cannot be fetched.
    """
    try:
        flow = get_google_flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials
        if not isinstance(credentials, Credentials):
            raise ValueError("Failed to obtain valid credentials from Google.")

        session_token = create_ephemeral_token(credentials)
        frontend_url = f"http://localhost:3000/dashboard?token={session_token}"

        return RedirectResponse(url=frontend_url)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {e}") from e
