from fastapi import APIRouter

from api.schemas.calendar import ToolCallRequest, ToolCallResult, WebhookResponse
from domain.third_party.google_service import create_calendar_event, decode_ephemeral_token

router = APIRouter()


@router.post("/webhook", response_model=WebhookResponse)
async def calendar_webhook(payload: ToolCallRequest) -> WebhookResponse | dict[str, str]:
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

        token = payload.message.get("call", {}).get("customData", {}).get("sessionToken")

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
