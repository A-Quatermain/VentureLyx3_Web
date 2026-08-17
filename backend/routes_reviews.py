import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from db import db, clean
from auth import get_current_business

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class ReviewInput(BaseModel):
    author: str = Field(min_length=1)
    rating: int = Field(ge=1, le=5)
    text: str = ""
    source: Optional[str] = "manual"


@router.get("")
async def list_reviews(biz: dict = Depends(get_current_business)):
    reviews = await db.reviews.find({"business_id": biz["id"]}).sort("created_at", -1).to_list(500)
    reviews = clean(reviews)
    count = len(reviews)
    rating = round(sum(r["rating"] for r in reviews) / count, 2) if count else 0
    # monthly trend (last 6 months buckets)
    trend = {}
    for r in reviews:
        month = r["created_at"][:7]
        trend.setdefault(month, []).append(r["rating"])
    trend_list = [{"month": m, "count": len(v), "avg": round(sum(v) / len(v), 1)}
                  for m, v in sorted(trend.items())][-6:]
    return {"reviews": reviews, "count": count, "rating": rating, "trend": trend_list}


@router.post("")
async def add_review(data: ReviewInput, biz: dict = Depends(get_current_business)):
    doc = data.model_dump()
    doc.update({"id": str(uuid.uuid4()), "business_id": biz["id"],
                "responded": False, "ai_response": "", "created_at": now_iso()})
    await db.reviews.insert_one(dict(doc))
    return clean(doc)


class ResponseSave(BaseModel):
    response: str


@router.put("/{review_id}/response")
async def save_response(review_id: str, data: ResponseSave, biz: dict = Depends(get_current_business)):
    res = await db.reviews.update_one({"id": review_id, "business_id": biz["id"]},
                                      {"$set": {"ai_response": data.response, "responded": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Review not found")
    return clean(await db.reviews.find_one({"id": review_id}))


# ---------- Review requests ----------
class RequestInput(BaseModel):
    customer_name: str = Field(min_length=1)
    channel: str = "email"
    contact: str = ""


@router.get("/requests")
async def list_requests(biz: dict = Depends(get_current_business)):
    return clean(await db.review_requests.find({"business_id": biz["id"]}).sort("created_at", -1).to_list(200))


@router.post("/requests")
async def add_request(data: RequestInput, biz: dict = Depends(get_current_business)):
    doc = data.model_dump()
    doc.update({"id": str(uuid.uuid4()), "business_id": biz["id"],
                "status": "sent", "created_at": now_iso()})
    await db.review_requests.insert_one(dict(doc))
    return clean(doc)


@router.delete("/{review_id}")
async def delete_review(review_id: str, biz: dict = Depends(get_current_business)):
    await db.reviews.delete_one({"id": review_id, "business_id": biz["id"]})
    return {"success": True}
