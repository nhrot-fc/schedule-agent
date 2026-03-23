from datetime import UTC, datetime, timedelta
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
    service = build("calendar", "v3", credentials=creds)

    start_datetime = f"{event_details['date']}T{event_details['time']}:00"
    start_dt = datetime.fromisoformat(start_datetime)

    duration_minutes = int(event_details.get("duration_minutes", 60))
    end_dt = start_dt + timedelta(minutes=duration_minutes)

    end_datetime = end_dt.isoformat()

    event = {
        "summary": event_details.get("title", "AI Scheduled Task"),
        "description": f"Scheduled by Riley for {event_details.get('name', 'User')}.",
        "start": {
            "dateTime": start_datetime,
            "timeZone": "America/Lima",
        },
        "end": {
            "dateTime": end_datetime,
            "timeZone": "America/Lima",
        },
    }

    event_result = service.events().insert(calendarId="primary", body=event).execute()
    return event_result.get("htmlLink")


def get_calendar_events(
    creds: Credentials,
    time_min: str | None = None,
    time_max: str | None = None,
    max_results: int = 100,
) -> list[dict[str, Any]]:
    service = build("calendar", "v3", credentials=creds)

    if not time_min:
        time_min = datetime.now(UTC).isoformat() + "Z"

    request_kwargs = {
        "calendarId": "primary",
        "timeMin": time_min,
        "maxResults": max_results,
        "singleEvents": True,
        "orderBy": "startTime",
    }

    if time_max:
        request_kwargs["timeMax"] = time_max

    events_result = service.events().list(**request_kwargs).execute()

    return events_result.get("items", [])


def delete_calendar_event(creds: Credentials, event_id: str) -> None:
    service = build("calendar", "v3", credentials=creds)
    service.events().delete(calendarId="primary", eventId=event_id).execute()
