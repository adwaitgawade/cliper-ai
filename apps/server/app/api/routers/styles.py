"""Caption presets, fonts and limits (shared with the Remotion composition)."""

from fastapi import APIRouter, Depends

from app.api.deps import rate_limit
from app.pipeline.caption_config import CaptionConfig, load_config

router = APIRouter(prefix="/v1", tags=["captions"], dependencies=[Depends(rate_limit)])


@router.get("/caption-styles", response_model=CaptionConfig, summary="Caption presets, fonts and override limits")
async def caption_styles() -> CaptionConfig:
    return load_config()
