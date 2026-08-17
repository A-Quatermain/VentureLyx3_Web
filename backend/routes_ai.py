import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional

from db import db
from auth import get_current_business
from ai_service import stream_ai, route

router = APIRouter(prefix="/api/ai", tags=["ai"])

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no",
               "Content-Type": "text/plain; charset=utf-8"}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def _log(biz, task):
    provider, model = route("generation", biz.get("ai_provider_pref", "auto"))[0]
    await db.ai_logs.insert_one({"id": str(uuid.uuid4()), "business_id": biz["id"],
                                 "provider": provider, "model": model,
                                 "task": task, "created_at": now_iso()})


def _biz_context(biz):
    return (f"Business name: {biz['name']}. Industry: {biz['industry']}. "
            f"Service area: {biz['service_area']}. Website: {biz.get('website') or 'none'}.")


class RecommendInput(BaseModel):
    issue_label: str
    detail: str = ""
    recommendation: str = ""


@router.post("/seo/recommend")
async def seo_recommend(data: RecommendInput, biz: dict = Depends(get_current_business)):
    await _log(biz, "seo_recommend")
    pref = biz.get("ai_provider_pref", "auto")
    system = ("You are an SEO specialist explaining fixes to a small business owner who is not "
              "technical. Use plain English, be encouraging, and give concrete step-by-step actions. "
              "Keep it under 200 words. Use short paragraphs, no markdown headers.")
    prompt = (f"{_biz_context(biz)}\nSEO issue found: '{data.issue_label}'. Details: {data.detail}. "
              f"Baseline tip: {data.recommendation}. Explain in plain English why this matters for "
              f"getting found by customers and exactly how to fix it.")
    return StreamingResponse(stream_ai("generation", system, prompt, pref),
                             media_type="text/plain", headers=SSE_HEADERS)


class PageGenInput(BaseModel):
    page_type: str = "service"   # service | local
    topic: str = Field(min_length=1)
    keywords: Optional[str] = ""


@router.post("/seo/generate-page")
async def generate_page(data: PageGenInput, biz: dict = Depends(get_current_business)):
    await _log(biz, "generate_page")
    pref = biz.get("ai_provider_pref", "auto")
    kind = "local landing page" if data.page_type == "local" else "service page"
    system = ("You are an expert local-SEO copywriter. Generate a complete, ready-to-publish web page. "
              "Output clearly labelled sections in this order: SEO TITLE, META DESCRIPTION, H1, "
              "INTRO, KEY BENEFITS (bulleted), SERVICE DETAILS, FAQ (3 Q&As), CALL TO ACTION, "
              "and JSON-LD SCHEMA. Write in a warm, trustworthy tone for a small business.")
    prompt = (f"{_biz_context(biz)}\nCreate a {kind} about: {data.topic}. "
              f"Target keywords: {data.keywords or data.topic}. "
              f"Optimise for local customers in {biz['service_area']}.")
    return StreamingResponse(stream_ai("heavy", system, prompt, pref),
                             media_type="text/plain", headers=SSE_HEADERS)


class ReviewRespondInput(BaseModel):
    author: str
    rating: int
    text: str = ""


@router.post("/reviews/respond")
async def review_respond(data: ReviewRespondInput, biz: dict = Depends(get_current_business)):
    await _log(biz, "review_response")
    pref = biz.get("ai_provider_pref", "auto")
    tone = "grateful and warm" if data.rating >= 4 else "empathetic, professional and solution-oriented"
    system = ("You write public replies to customer reviews on behalf of a small business owner. "
              f"Be {tone}, concise (2-4 sentences), personal, and never defensive. "
              "Do not invent facts. Output only the reply text.")
    prompt = (f"{_biz_context(biz)}\nReview from {data.author} ({data.rating}/5 stars): "
              f"\"{data.text}\"\nWrite a reply the owner can approve and post.")
    return StreamingResponse(stream_ai("generation", system, prompt, pref),
                             media_type="text/plain", headers=SSE_HEADERS)
