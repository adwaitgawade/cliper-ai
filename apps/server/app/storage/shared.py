"""Cross-workspace cache for public-URL sources and their transcripts.

When several workspaces submit the same public video (most often a YouTube link), it is
downloaded and transcribed once. The cache lives under `shared/` in the bucket:

- `shared/sources/<sha256(canonical url)>/source.<ext>` plus `meta.json` (title, type).
- `shared/transcripts/<sha256(url, stt provider, model, language)>.json`.

Each workspace still gets its own copy (a server-side copy into `ws/<id>/...`), so
deleting or purging a workspace's video works exactly as before and never touches
another workspace's data. Only URL ingests are cached: the URL was fetched without any
credentials, so its content is public. Uploaded files are never shared. Entries expire
after SHARED_CACHE_TTL_DAYS (see housekeeping.sweep_shared_cache).
"""

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit

from botocore.exceptions import ClientError

SHARED_PREFIX = "shared/"
_YT_HOSTS = {"youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "youtu.be"}
_YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
_YT_PATHS = ("shorts", "live", "embed", "v")
_TRACKING = re.compile(r"^(utm_.*|fbclid|gclid|igshid|si|feature|ref|ref_src|t|start)$")


def canonical_source(url: str) -> str:
    """One key per video, whatever the link variant (youtu.be, shorts, tracking params)."""
    parts = urlsplit(url.strip())
    host = (parts.hostname or "").lower().removeprefix("www.")
    if host in _YT_HOSTS:
        video_id = None
        if host == "youtu.be":
            video_id = parts.path.strip("/").split("/")[0]
        else:
            params = dict(parse_qsl(parts.query))
            segments = [p for p in parts.path.split("/") if p]
            if "v" in params:
                video_id = params["v"]
            elif len(segments) >= 2 and segments[0] in _YT_PATHS:
                video_id = segments[1]
        if video_id and _YT_ID.match(video_id):
            return f"youtube:{video_id}"
    query = sorted((k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not _TRACKING.match(k))
    path = parts.path.rstrip("/") or "/"
    port = f":{parts.port}" if parts.port else ""
    return f"url:{(parts.scheme or 'https').lower()}://{host}{port}{path}" + (f"?{urlencode(query)}" if query else "")


def _digest(*parts: str) -> str:
    return hashlib.sha256(json.dumps(parts).encode()).hexdigest()


def source_prefix(url: str) -> str:
    return f"{SHARED_PREFIX}sources/{_digest(canonical_source(url))}/"


def transcript_key(url: str, *, provider: str, model: str | None, language: str) -> str:
    return f"{SHARED_PREFIX}transcripts/{_digest(canonical_source(url), provider, model or '', language)}.json"


@dataclass(frozen=True)
class SharedSource:
    key: str
    ext: str
    title: str | None
    content_type: str | None
    size_bytes: int | None


def _missing(e: ClientError) -> bool:
    return e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound")


def find_source(storage: Any, url: str) -> SharedSource | None:
    prefix = source_prefix(url)
    try:
        meta = storage.get_json(prefix + "meta.json")
    except ClientError as e:
        if _missing(e):
            return None
        raise
    name = str(meta.get("name") or "")
    if not name or "/" in name:
        return None
    return SharedSource(
        key=prefix + name,
        ext=PurePosixPath(name).suffix.lower(),
        title=meta.get("title"),
        content_type=meta.get("content_type"),
        size_bytes=meta.get("size_bytes"),
    )


def restore_source(storage: Any, source: SharedSource, dst_key: str) -> bool:
    """Copy a cached source into a workspace. False if the entry expired meanwhile."""
    try:
        storage.copy(source.key, dst_key)
    except ClientError as e:
        if _missing(e):
            return False
        raise
    return True


def store_source(
    storage: Any,
    url: str,
    src_key: str,
    *,
    title: str | None,
    content_type: str | None,
    size_bytes: int | None,
) -> bool:
    """Add a workspace's processed source to the cache. False if it was already there."""
    prefix = source_prefix(url)
    if storage.exists(prefix + "meta.json"):
        return False
    name = "source" + (PurePosixPath(src_key).suffix.lower() or ".mp4")
    storage.copy(src_key, prefix + name)
    # Written last: an entry is only visible once its file is in place.
    storage.put_json(
        prefix + "meta.json",
        {
            "name": name,
            "title": title,
            "content_type": content_type,
            "size_bytes": size_bytes,
            "canonical": canonical_source(url),
            "created_at": datetime.now(UTC).isoformat(),
        },
    )
    return True
