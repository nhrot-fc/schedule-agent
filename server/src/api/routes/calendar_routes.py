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
    update_calendar_event,
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
    function_name = tool_call.get("function", {}).get("name", "Calendar")

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

        user_tz = message_data.get("variableValues", {}).get("timeZone")
        if not user_tz:
            user_tz = call_data.get("variableValues", {}).get(
                "timeZone", "America/Lima"
            )

        db = SessionLocal()
        try:
            current_user = verify_token(token=token, db=db)
            creds = credentials_from_db_user(current_user)
            if function_name == "schedule_events":
                events = args.get("events", [])
                created_count = 0
                for ev in events:
                    create_calendar_event(creds, ev, user_tz)
                    created_count += 1
                success_msg = f"SUCCESS: {created_count} events successfully scheduled. Please confirm."

            elif function_name == "update_events":
                events_to_update = args.get("events", [])
                updated_count = 0
                for ev in events_to_update:
                    event_id = ev.get("event_id")
                    if event_id:
                        update_calendar_event(creds, event_id, ev, user_tz)
                        updated_count += 1

                success_msg = f"SUCCESS: {updated_count} events successfully updated/rescheduled. Please confirm."

            elif function_name == "delete_events":
                event_ids = args.get("event_ids", [])
                deleted_count = 0
                for eid in event_ids:
                    try:
                        delete_calendar_event(creds, eid)
                        deleted_count += 1
                    except Exception as e:
                        print(f"Warning: Could not delete {eid}: {e}")
                success_msg = f"SUCCESS: {deleted_count} events successfully deleted. Please confirm."

            else:
                raise ValueError(f"Function {function_name} not supported.")
        finally:
            db.close()

        return WebhookResponse(
            results=[ToolCallResult(toolCallId=tool_call_id, result=success_msg)]
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
