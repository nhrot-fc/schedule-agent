from datetime import datetime, timedelta
from typing import Any

import jwt
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from infrastructure.config import settings

SCOPES: list[str] = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]


def credentials_from_db_user(user) -> Credentials:
    """Reconstruye el objeto Credentials de Google a partir de la Base de Datos."""
    creds = Credentials(
        token=user.google_access_token,
        refresh_token=user.google_refresh_token,
        token_uri=user.google_token_uri,
        client_id=user.google_client_id,
        client_secret=user.google_client_secret,
        scopes=user.google_scopes.split(",") if user.google_scopes else SCOPES,
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return creds


def get_google_flow() -> Flow:
    """
    Initializes and returns the Google OAuth flow from environment config.

    Returns:
        Flow: An instance of `google_auth_oauthlib.flow.Flow` configured
            with the needed client ID, secret, and scopes.
    """
    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }

    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = settings.google_redirect_uri
    return flow


def create_ephemeral_token(credentials: Credentials) -> str:
    """
    Encrypts the OAuth credentials into a stateless, time-limited JWT.

    Args:
        credentials (Credentials): The decoded Google API credentials.

    Returns:
        str: An encoded JWT string carrying the serialized credentials
            and an expiration time.
    """
    payload = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_ephemeral_token(token: str) -> Credentials:
    """
    Decrypts the provided JWT and reconstitutes the Google Credentials object,
    refreshing it via the Google API if the token has expired.

    Args:
        token (str): The stateless JWT session string.

    Returns:
        Credentials: Authenticated Google credentials object instance.
    """
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])

    creds = Credentials(
        token=payload.get("token"),
        refresh_token=payload.get("refresh_token"),
        token_uri=payload.get("token_uri"),
        client_id=payload.get("client_id"),
        client_secret=payload.get("client_secret"),
        scopes=payload.get("scopes"),
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())

    return creds


def create_calendar_event(creds: Credentials, event_details: dict[str, Any]) -> str:
    """
    Creates an event on the user's primary calendar using the given credentials.

    Args:
        creds (Credentials): Validated Google API credentials for a user.
        event_details (dict[str, Any]): Dictionary containing event data
            including 'date', 'time', 'title', and 'name'.

    Returns:
        str: The URL linking to the publicly visible, dynamically generated
            calendar event.
    """
    service = build("calendar", "v3", credentials=creds)

    start_datetime = (
        f"{event_details.get('date', '')}T{event_details.get('time', '00:00')}:00"
    )

    start_dt = datetime.fromisoformat(start_datetime)
    end_dt = start_dt + timedelta(minutes=30)
    end_datetime = end_dt.isoformat()

    event = {
        "summary": event_details.get("title", "AI Scheduled Meeting"),
        "description": f"Scheduled by Voice Assistant for {event_details.get('name', 'Unknown User')}.",
        "start": {
            "dateTime": start_datetime,
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": end_datetime,
            "timeZone": "UTC",
        },
    }

    event_result = service.events().insert(calendarId="primary", body=event).execute()
    return event_result.get("htmlLink", "")


def get_calendar_events(
    creds: Credentials, max_results: int = 15
) -> list[dict[str, Any]]:
    """Obtiene los próximos eventos del calendario del usuario."""
    service = build("calendar", "v3", credentials=creds)

    # Obtener la hora actual en formato RFC3339 (requerido por Google)
    now = datetime.utcnow().isoformat() + "Z"

    # Llamar a la API de Google Calendar
    events_result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    return events_result.get("items", [])


def delete_calendar_event(creds: Credentials, event_id: str) -> None:
    """Elimina un evento específico del calendario."""
    service = build("calendar", "v3", credentials=creds)
    service.events().delete(calendarId="primary", eventId=event_id).execute()
