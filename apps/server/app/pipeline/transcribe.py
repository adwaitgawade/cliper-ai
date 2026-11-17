"""Speech recognition (Vercel AI Gateway, with local Moondream Parakeet Redux as the
fallback or the sole engine) and sentence segmentation. The engine is chosen in stt.toml.

Redux has no diarization, so its words carry DEFAULT_SPEAKER; the gateway fills speakers in
when the model reports them (elevenlabs/scribe-v2 does).
"""

from collections.abc import Callable
from pathlib import Path

import structlog

from app.core.config import Settings
from app.pipeline.gateway_stt import transcribe_audio_gateway
from app.pipeline.redux import transcribe_audio_redux
from app.pipeline.stt_config import SttConfig, load_stt_config
from app.pipeline.types import Sentence, Transcript, Word

log = structlog.get_logger()

SENTENCE_END = (".", "?", "!", "…")
_TRAILING_QUOTES = "\"')]}”’»"


def transcribe_audio(
    wav_path: Path,
    *,
    settings: Settings,
    stt: SttConfig | None = None,
    language: str | None = None,
    on_progress: Callable[[float], None] | None = None,
) -> tuple[str, list[Word], SttConfig]:
    """Transcribe with the engine selected in stt.toml.

    Returns (language, words, engine), where `engine` is the config that actually produced
    the words: it names redux when the gateway failed and the fallback ran.
    """
    stt = stt or load_stt_config()
    if stt.provider == "gateway":
        try:
            if not settings.ai_gateway_api_key:
                raise ValueError('AI_GATEWAY_API_KEY is required when stt.toml has provider = "gateway"')
            gw = stt.gateway
            language_, words = transcribe_audio_gateway(
                wav_path,
                api_key=settings.ai_gateway_api_key,
                base_url=settings.ai_gateway_base_url,
                model=gw.model,
                language=language,
                chunk_seconds=gw.chunk_seconds,
                bitrate_kbps=gw.bitrate_kbps,
                provider_options=gw.provider_options,
                ffmpeg_bin=settings.ffmpeg_bin,
                on_progress=on_progress,
            )
            return language_, words, stt
        except Exception:
            if not stt.fallback_to_redux:
                raise
            log.warning("gateway_stt_failed_falling_back_to_redux", model=stt.gateway.model, exc_info=True)
            stt = stt.model_copy(update={"provider": "redux"})
    language_, words = transcribe_audio_redux(
        wav_path,
        model=stt.redux.model,
        device=stt.redux.device,
        language=language,
        fallback_language=stt.redux.fallback_language,
        on_progress=on_progress,
    )
    return language_, words, stt


def _ends_sentence(word: str) -> bool:
    return word.rstrip(_TRAILING_QUOTES).endswith(SENTENCE_END)


def segment_sentences(
    words: list[Word],
    *,
    pause_threshold: float = 0.7,
    max_sentence_duration: float = 20.0,
) -> list[Sentence]:
    """Split words into sentences on punctuation, pauses > `pause_threshold`, and speaker
    changes (FR-TRN-4). Very long unpunctuated runs are split so they can still fit a clip."""
    sentences: list[Sentence] = []
    start_idx = 0
    for i, word in enumerate(words):
        nxt = words[i + 1] if i + 1 < len(words) else None
        boundary = (
            nxt is None
            or _ends_sentence(word.word)
            or (nxt.start - word.end) > pause_threshold
            or nxt.speaker != word.speaker
            or (word.end - words[start_idx].start) >= max_sentence_duration
        )
        if boundary:
            chunk = words[start_idx : i + 1]
            sentences.append(
                Sentence(
                    id=len(sentences),
                    start=chunk[0].start,
                    end=chunk[-1].end,
                    text=" ".join(w.word for w in chunk),
                    speaker=chunk[0].speaker,
                    word_start=start_idx,
                    word_end=i + 1,
                )
            )
            start_idx = i + 1
    return sentences


def build_transcript(language: str, duration: float, words: list[Word]) -> Transcript:
    return Transcript(language=language, duration=duration, sentences=segment_sentences(words), words=words)
