"""Convert stored sources that aren't H.264 (e.g. AV1 from YouTube) to H.264, the same way
ingest now does for new videos. Clip timings and crops stay valid: size, fps and timing
are unchanged.

    uv run python -m scripts.transcode_sources            # every ready video that needs it
    uv run python -m scripts.transcode_sources --dry-run  # only list them
"""

import sys
import tempfile
from pathlib import Path

from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import Video, VideoStatus
from app.db.session import sync_session
from app.pipeline import media
from app.storage.s3 import get_storage, video_key


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    s = get_settings()
    storage = get_storage()
    with sync_session() as db:
        videos = [
            v
            for v in db.execute(select(Video).where(Video.status == VideoStatus.ready)).scalars()
            if (v.probe or {}).get("video_codec") not in media.PLAYABLE_VIDEO_CODECS
        ]
    print(f"{len(videos)} video(s) to convert")
    failures = 0
    for video in videos:
        label = video.title or video.filename or video.source_url or str(video.id)
        codec = (video.probe or {}).get("video_codec")
        if dry_run:
            print(f"  would convert {codec} -> h264  [{label}]")
            continue
        if storage.head(video.storage_key) is None:
            print(f"  ! source file missing in storage  [{label}]")
            failures += 1
            continue
        print(f"  converting {codec} -> h264  [{label}] ...", flush=True)
        with tempfile.TemporaryDirectory(prefix="clippro-transcode-") as tmp:
            src = storage.download_file(video.storage_key, Path(tmp) / ("source" + Path(video.storage_key).suffix))
            before = media.probe(src, ffprobe=s.ffprobe_bin)
            out = media.transcode_h264(
                src,
                Path(tmp) / "out.mp4",
                audio_codec=before.audio_codec,
                ffmpeg=s.ffmpeg_bin,
                encoder=s.video_encoder,
                timeout=s.stage_timeout_seconds,
            )
            after = media.probe(out, ffprobe=s.ffprobe_bin)
            key = video_key(video.workspace_id, video.id, ".mp4")
            storage.upload_file(out, key, "video/mp4")
            with sync_session() as db:
                db.execute(
                    update(Video)
                    .where(Video.id == video.id)
                    .values(
                        storage_key=key,
                        content_type="video/mp4",
                        size_bytes=out.stat().st_size,
                        probe=after.to_dict(),
                    )
                )
                db.commit()
            if key != video.storage_key:
                storage.delete(video.storage_key)
            mb_in, mb_out = src.stat().st_size / 1e6, out.stat().st_size / 1e6
        print(f"    done: {mb_in:.0f} MB {codec} -> {mb_out:.0f} MB {after.video_codec}", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
