"""Source acquisition: URL download with yt-dlp (FR-ING-2)."""

from pathlib import Path
from typing import Any

from app.core.errors import PipelineError
from app.core.net import UnsafeUrl, assert_public_url


def download_url(
    url: str,
    dest_dir: Path,
    *,
    max_bytes: int,
    max_duration: float,
    allowed_domains: list[str],
) -> Path:
    """Download a video to `dest_dir` and return the file path.

    The URL host is checked against private and link-local ranges first. yt-dlp may
    follow redirects to other hosts, so production workers should also run with
    restricted network egress (see README).
    """
    try:
        assert_public_url(url, allowed_domains=allowed_domains or None)
    except UnsafeUrl as e:
        raise PipelineError("unsafe_url", e.message) from e

    import yt_dlp

    def _too_long(info: dict[str, Any], *, incomplete: bool) -> str | None:
        duration = info.get("duration")
        if duration and duration > max_duration:
            return "video is too long"
        return None

    dest_dir.mkdir(parents=True, exist_ok=True)
    opts: dict[str, Any] = {
        "outtmpl": str(dest_dir / "source.%(ext)s"),
        "format": "bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "max_filesize": max_bytes,
        "match_filter": _too_long,
        "socket_timeout": 30,
        "retries": 3,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as e:
        raise PipelineError(
            "download_failed", "Could not download the video from the URL", details=str(e)[-500:]
        ) from e
    if info is None:
        raise PipelineError("download_failed", "The URL did not yield a downloadable video")
    files = sorted(p for p in dest_dir.glob("source.*") if not p.name.endswith((".part", ".ytdl")))
    if not files:
        raise PipelineError("download_failed", "Download skipped: the video exceeds the size or duration limit")
    return files[0]
