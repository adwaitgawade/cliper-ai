"""Fill in `title` and `thumbnail_key` for videos ingested before those columns existed.

    uv run python -m scripts.backfill_video_meta            # all workspaces
    uv run python -m scripts.backfill_video_meta --dry-run  # only list what would change

Titles for URL videos come from the source site's metadata (the video is not re-downloaded).
Thumbnails are cut from the source file already in storage; when that file is gone, URL
videos fall back to the site's own thumbnail image. Safe to re-run: videos that already
have a value are skipped.
"""

import sys
import tempfile
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import or_, select, update

from app.core.config import get_settings
from app.core.net import assert_public_url
from app.db.models import Video, VideoSource, VideoStatus
from app.db.session import sync_session
from app.pipeline import render
from app.storage.s3 import get_storage, video_thumb_key


def fetch_info(url: str, allowed_domains: list[str]) -> dict[str, Any]:
    """Site metadata only; nothing is downloaded."""
    assert_public_url(url, allowed_domains=allowed_domains or None)
    import yt_dlp

    opts: dict[str, Any] = {"noplaylist": True, "quiet": True, "no_warnings": True, "socket_timeout": 30}
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False) or {}


def clean_title(info: dict[str, Any]) -> str | None:
    title = info.get("title")
    return (title.strip()[:500] or None) if isinstance(title, str) else None


def make_thumb(video: Video, workdir: Path, site_thumbnail: str | None) -> str | None:
    s = get_settings()
    storage = get_storage()
    if storage.head(video.storage_key) is not None:
        frame_source = storage.download_file(video.storage_key, workdir / ("source" + Path(video.storage_key).suffix))
        at = min(5.0, (video.duration or 0) / 3)
    elif site_thumbnail:
        assert_public_url(site_thumbnail)
        resp = httpx.get(site_thumbnail, timeout=30, follow_redirects=False)
        resp.raise_for_status()
        frame_source = workdir / "site-thumb"
        frame_source.write_bytes(resp.content)
        at = 0.0
    else:
        return None
    # ffmpeg reads stills as one-frame videos, so the same helper resizes and converts to JPEG.
    thumb = render.make_thumbnail(
        ffmpeg=s.ffmpeg_bin, video=frame_source, at=at, output=workdir / "thumb.jpg", width=640
    )
    key = video_thumb_key(video.workspace_id, video.id)
    storage.upload_file(thumb, key, "image/jpeg")
    return key


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    s = get_settings()
    with sync_session() as db:
        videos = list(
            db.execute(
                select(Video)
                .where(
                    or_(
                        Video.thumbnail_key.is_(None),
                        (Video.source == VideoSource.url) & Video.title.is_(None),
                    )
                )
                .order_by(Video.created_at)
            ).scalars()
        )
    print(f"{len(videos)} video(s) to check")
    failures = 0
    for video in videos:
        values: dict[str, Any] = {}
        label = video.source_url or video.filename or str(video.id)
        info: dict[str, Any] = {}
        if video.source == VideoSource.url and video.source_url:
            try:
                info = fetch_info(video.source_url, s.url_ingest_allowed_domains)
            except Exception as e:  # UnsafeUrl, DownloadError, network errors
                failures += 1
                print(f"  ! info    {label}: {e}")
        if video.title is None:
            values["title"] = clean_title(info)
        # Only videos whose source file made it into storage have something to cut from.
        if video.thumbnail_key is None and video.status == VideoStatus.ready and not dry_run:
            try:
                with tempfile.TemporaryDirectory(prefix="clippro-backfill-") as tmp:
                    values["thumbnail_key"] = make_thumb(video, Path(tmp), info.get("thumbnail"))
            except Exception as e:
                failures += 1
                print(f"  ! thumb   {label}: {e}")
            if values.get("thumbnail_key") is None:
                print(f"  - no thumbnail source left in storage  [{label}]")
        values = {k: v for k, v in values.items() if v is not None}
        if not values:
            continue
        print(f"  {'would set' if dry_run else 'set'} {', '.join(f'{k}={v!r}' for k, v in values.items())}  [{label}]")
        if not dry_run:
            with sync_session() as db:
                db.execute(update(Video).where(Video.id == video.id).values(**values))
                db.commit()
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
