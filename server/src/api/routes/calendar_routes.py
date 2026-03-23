import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies.auth import get_current_user, get_current_user as verify_token
from api.schemas.calendar import ToolCallRequest, ToolCallResult, WebhookResponse
from domain.entities.user import UserEntity
from domain.third_party.google_service import (
    create_calendar_event,
    credentials_from_db_user,
    delete_calendar_event,
    get_calendar_events,
)
from infrastructure.database import SessionLocal

router = APIRouter()


@router.get("/events")
async def list_events(
    current_user: Annotated[UserEntity, Depends(get_current_user)],
    time_min: str | None = None,
    time_max: str | None = None,
):
    try:
        creds = credentials_from_db_user(current_user)
        events = get_calendar_events(creds, time_min=time_min, time_max=time_max)
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/events/{event_id}")
async def cancel_event(
    current_user: Annotated[UserEntity, Depends(get_current_user)],
    event_id: str,
):
    try:
        creds = credentials_from_db_user(current_user)
        delete_calendar_event(creds, event_id)
        return {"status": "success", "message": "Event deleted."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/webhook", response_model=WebhookResponse)
async def calendar_webhook(
    payload: ToolCallRequest,
) -> WebhookResponse:
    message_data = payload.message or {}
    tool_calls = message_data.get("toolCalls", [])
    if not tool_calls and "toolCall" in message_data:
        tool_calls = [message_data["toolCall"]]

    if not tool_calls:
        return WebhookResponse(error="No tool calls found")

    tool_call = tool_calls[0]
    tool_call_id = tool_call.get("id", "unknown_id")

    try:
        args = tool_call.get("function", {}).get("arguments", {})
        if not args:
            args = tool_call.get("parameters", {})

        if isinstance(args, str):
            args = json.loads(args)

        call_data = message_data.get("call", {})

        token = message_data.get("variableValues", {}).get("sessionToken")
        if not token:
            token = message_data.get("variables", {}).get("sessionToken")
        if not token:
            token = (
                call_data.get("assistantOverrides", {})
                .get("variableValues", {})
                .get("sessionToken")
            )
        if not token:
            token = call_data.get("variableValues", {}).get("sessionToken")
        if not token:
            token = call_data.get("customData", {}).get("sessionToken")

        if not token:
            raise ValueError("No session token received. User must log in.")

        db = SessionLocal()
        try:
            current_user = verify_token(token=token, db=db)
            creds = credentials_from_db_user(current_user)
            event_link = create_calendar_event(creds, args)
        finally:
            db.close()

        title = args.get("title", "Meeting")
        date = args.get("date", "unknown")
        time = args.get("time", "unknown")
        duration = args.get("duration_minutes", 30)

        success_msg = f"SUCCESS: Event '{title}' scheduled for {date} at {time} ({duration} mins). Link: {event_link}. Please confirm to the user."

        return WebhookResponse(
            results=[
                ToolCallResult(
                    toolCallId=tool_call_id,
                    result=success_msg,
                )
            ]
        )

    except Exception as e:
        error_msg = f"ERROR scheduling event: {e}. Please apologize to the user."

        return WebhookResponse(
            results=[
                ToolCallResult(
                    toolCallId=tool_call_id,
                    result=error_msg,
                )
            ]
        )
