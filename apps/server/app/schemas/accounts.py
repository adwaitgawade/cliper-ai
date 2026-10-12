import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db.models import WorkspaceRole


class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    is_personal: bool
    role: WorkspaceRole
    created_at: datetime


class MeOut(BaseModel):
    user_id: uuid.UUID
    email: str | None
    auth: str
    current_workspace_id: uuid.UUID
    workspaces: list[WorkspaceOut]


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class MemberOut(BaseModel):
    user_id: uuid.UUID
    email: str | None
    role: WorkspaceRole
    created_at: datetime


class MemberAdd(BaseModel):
    email: EmailStr = Field(description="The user must already have signed up")
    role: WorkspaceRole = WorkspaceRole.member


class MemberUpdate(BaseModel):
    role: WorkspaceRole


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    prefix: str
    created_at: datetime
    last_used_at: datetime | None
    revoked_at: datetime | None


class ApiKeyCreated(ApiKeyOut):
    key: str = Field(description="Shown once. Store it securely; it cannot be retrieved again.")
