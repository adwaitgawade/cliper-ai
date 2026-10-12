from datetime import datetime

from pydantic import BaseModel


class Page[T](BaseModel):
    items: list[T]
    next_cursor: datetime | None = None


class ErrorBody(BaseModel):
    code: str
    message: str
    details: object | None = None
    request_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
