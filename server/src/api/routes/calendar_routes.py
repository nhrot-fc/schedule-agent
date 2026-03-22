from fastapi import APIRouter, Depends, Header, HTTPException

from api.schemas.calendar import ToolCallRequest, ToolCallResult, WebhookResponse
from domain.third_party.google_service import (
    create_calendar_event,
    decode_ephemeral_token,
    delete_calendar_event,
    get_calendar_events,
)

router = APIRouter()


async def get_session_token(authorization: str = Header(None)) -> str:
    """Extrae el JWT token del header Authorization: Bearer <token>"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Token de sesión faltante o inválido."
        )
    return authorization.split(" ")[1]


@router.get("/events")
async def list_events(token: str = Depends(get_session_token)):
    """Devuelve los próximos eventos para renderizarlos en React."""
    try:
        creds = decode_ephemeral_token(token)
        events = get_calendar_events(creds)
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/events/{event_id}")
async def cancel_event(event_id: str, token: str = Depends(get_session_token)):
    """Cancela un evento desde la interfaz web."""
    try:
        creds = decode_ephemeral_token(token)
        delete_calendar_event(creds, event_id)
        return {"status": "success", "message": "Evento eliminado."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/webhook", response_model=WebhookResponse)
async def calendar_webhook(
    payload: ToolCallRequest,
) -> WebhookResponse | dict[str, str]:
    """
    Webhook endpoint triggered by the voice assistant tool call.

    Extracts the session token from the custom data, decodes the Google
    credentials, and schedules an event on the user's primary calendar.

    Args:
        payload (ToolCallRequest): The incoming webhook payload.

    Returns:
        WebhookResponse | dict[str, str]: A success payload with the event link,
            or an error structure if creation failed.
    """
    try:
        tool_call = payload.message.get("toolCall", {})
        args = tool_call.get("parameters", {})

        token = (
            payload.message.get("call", {}).get("customData", {}).get("sessionToken")
        )

        if not token:
            raise ValueError("No session token provided to webhook.")

        creds = decode_ephemeral_token(token)
        event_link = create_calendar_event(creds, args)

        return WebhookResponse(
            results=[
                ToolCallResult(
                    toolCallId=tool_call.get("id", ""),
                    result=f"Event successfully created. Calendar link: {event_link}",
                )
            ]
        )

    except Exception as e:
        return {"error": str(e)}
