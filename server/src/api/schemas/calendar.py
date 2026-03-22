from typing import Any

from pydantic import BaseModel


class WebhookMessage(BaseModel):
    toolCall: dict[str, Any] | None = None
    call: dict[str, Any] | None = None


class ToolCallRequest(BaseModel):
    message: dict[str, Any]


class ToolCallResult(BaseModel):
    toolCallId: str
    result: str


class WebhookResponse(BaseModel):
    results: list[ToolCallResult] | None = None
    error: str | None = None
