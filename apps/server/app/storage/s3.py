"""S3-compatible object storage (SeaweedFS locally; Supabase Storage S3, AWS S3 or R2 in prod)."""

import json
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import Settings, get_settings


def _client(settings: Settings, endpoint_url: str | None) -> Any:
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url or None,  # empty means AWS S3 itself
        region_name=settings.s3_region,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if settings.s3_force_path_style else "auto"},
            retries={"max_attempts": 5, "mode": "standard"},
        ),
    )


class Storage:
    def __init__(self, settings: Settings) -> None:
        self.bucket = settings.s3_bucket
        self.ttl = settings.presign_ttl_seconds
        self.client = _client(settings, settings.s3_endpoint_url)
        # Presigned URLs must be signed for the host the client will actually call.
        self.public_client = (
            _client(settings, settings.s3_public_endpoint_url) if settings.s3_public_endpoint_url else self.client
        )

    # --- presigned URLs ---------------------------------------------------------
    def presign_put(self, key: str, content_type: str, expires: int | None = None) -> str:
        return self.public_client.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires or self.ttl,
        )

    def presign_get(self, key: str, *, filename: str | None = None, expires: int | None = None) -> str:
        params: dict[str, Any] = {"Bucket": self.bucket, "Key": key}
        if filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
        return self.public_client.generate_presigned_url("get_object", Params=params, ExpiresIn=expires or self.ttl)

    # --- objects -------------------------------------------------------------------
    def head(self, key: str) -> dict[str, Any] | None:
        try:
            return self.client.head_object(Bucket=self.bucket, Key=key)
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return None
            raise

    def exists(self, key: str) -> bool:
        return self.head(key) is not None

    def upload_file(self, path: Path, key: str, content_type: str | None = None) -> None:
        extra = {"ContentType": content_type} if content_type else None
        self.client.upload_file(str(path), self.bucket, key, ExtraArgs=extra)

    def upload_fileobj(self, fileobj: Any, key: str, content_type: str | None = None) -> None:
        extra = {"ContentType": content_type} if content_type else None
        self.client.upload_fileobj(fileobj, self.bucket, key, ExtraArgs=extra)

    def download_file(self, key: str, path: Path) -> Path:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".part")
        self.client.download_file(self.bucket, key, str(tmp))
        tmp.replace(path)
        return path

    def put_json(self, key: str, data: Any) -> None:
        body = json.dumps(data, separators=(",", ":"), default=str).encode()
        self.client.put_object(Bucket=self.bucket, Key=key, Body=body, ContentType="application/json")

    def get_json(self, key: str) -> Any:
        obj = self.client.get_object(Bucket=self.bucket, Key=key)
        return json.loads(obj["Body"].read())

    def delete_prefix(self, prefix: str) -> int:
        deleted = 0
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
            objects = [{"Key": o["Key"]} for o in page.get("Contents", [])]
            if objects:
                self.client.delete_objects(Bucket=self.bucket, Delete={"Objects": objects, "Quiet": True})
                deleted += len(objects)
        return deleted

    def ensure_bucket(self) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError:
            self.client.create_bucket(Bucket=self.bucket)

    def ping(self) -> None:
        self.client.head_bucket(Bucket=self.bucket)


@lru_cache
def get_storage() -> Storage:
    return Storage(get_settings())


# --- key layout -------------------------------------------------------------------
# Everything for a workspace lives under ws/<workspace_id>/, so tenant data can be
# listed or purged by prefix.


def video_key(workspace_id: uuid.UUID, video_id: uuid.UUID, ext: str) -> str:
    return f"ws/{workspace_id}/videos/{video_id}/source{ext}"


def video_prefix(workspace_id: uuid.UUID, video_id: uuid.UUID) -> str:
    return f"ws/{workspace_id}/videos/{video_id}/"


def job_prefix(workspace_id: uuid.UUID, job_id: uuid.UUID) -> str:
    return f"ws/{workspace_id}/jobs/{job_id}/"


def job_key(workspace_id: uuid.UUID, job_id: uuid.UUID, name: str) -> str:
    return f"{job_prefix(workspace_id, job_id)}{name}"


def clip_key(workspace_id: uuid.UUID, job_id: uuid.UUID, clip_id: uuid.UUID, name: str) -> str:
    return f"{job_prefix(workspace_id, job_id)}clips/{clip_id}/{name}"
