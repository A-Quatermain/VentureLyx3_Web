import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from db import db, clean
from auth import get_current_user, get_current_business
from ai_service import complete_ai, route

router = APIRouter(prefix="/api", tags=["business"])


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class OnboardingInput(BaseModel):
    name: str = Field(min_length=1)
    website: Optional[str] = ""
    industry: str = Field(min_length=1)
    service_area: str = Field(min_length=1)


@router.post("/business/onboard")
async def onboard(data: OnboardingInput, user: dict = Depends(get_current_user)):
    existing = await db.businesses.find_one({"owner_id": user["id"]})
    doc = {
        "website": data.website or "",
        "industry": data.industry,
        "service_area": data.service_area,
        "name": data.name,
        "ai_provider_pref": "auto",
        "updated_at": now_iso(),
    }
    if existing:
        await db.businesses.update_one({"owner_id": user["id"]}, {"$set": doc})
        biz = await db.businesses.find_one({"owner_id": user["id"]})
    else:
        doc.update({"id": str(uuid.uuid4()), "org_id": user["org_id"],
                    "owner_id": user["id"], "created_at": now_iso()})
        await db.businesses.insert_one(dict(doc))
        biz = doc
    return clean(biz)


class SettingsInput(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    service_area: Optional[str] = None
    ai_provider_pref: Optional[str] = None


@router.put("/business")
async def update_business(data: SettingsInput, biz: dict = Depends(get_current_business)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    await db.businesses.update_one({"id": biz["id"]}, {"$set": updates})
    return clean(await db.businesses.find_one({"id": biz["id"]}))


def _growth_score(m):
    seo = m["seo_score"]
    rev = min(m["revenue"] / 5000 * 100, 100) if m["revenue"] else 0
    reviews = (m["rating"] / 5 * 100) if m["rating"] else 0
    pipeline = min(m["pipeline_value"] / 10000 * 100, 100) if m["pipeline_value"] else 0
    leads = min(m["leads"] * 10, 100)
    score = seo * 0.3 + rev * 0.2 + reviews * 0.2 + pipeline * 0.15 + leads * 0.15
    return round(score)


@router.get("/command/metrics")
async def command_metrics(biz: dict = Depends(get_current_business)):
    bid = biz["id"]
    leads = await db.leads.find({"business_id": bid}).to_list(1000)
    open_leads = [l for l in leads if l["stage"] not in ("won", "lost")]
    won = [l for l in leads if l["stage"] == "won"]
    customers = await db.customers.count_documents({"business_id": bid})
    jobs = await db.jobs.find({"business_id": bid}).to_list(1000)
    invoices = await db.invoices.find({"business_id": bid}).to_list(1000)
    paid = [i for i in invoices if i["status"] == "paid"]
    reviews = await db.reviews.find({"business_id": bid}).to_list(1000)
    audit = await db.seo_audits.find({"business_id": bid}).sort("created_at", -1).to_list(1)

    rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
    metrics = {
        "revenue": sum(i["amount"] for i in paid),
        "leads": len(open_leads),
        "won_leads": len(won),
        "customers": customers + len(won),
        "pipeline_value": sum(l.get("value", 0) for l in open_leads),
        "jobs_open": len([j for j in jobs if j["status"] != "completed"]),
        "jobs_total": len(jobs),
        "invoices_outstanding": sum(i["amount"] for i in invoices if i["status"] != "paid"),
        "seo_score": audit[0]["score"] if audit else 0,
        "rating": rating,
        "review_count": len(reviews),
        "expenses": 0,
    }
    metrics["growth_score"] = _growth_score(metrics)
    return metrics


@router.get("/command/next-best-action")
async def next_best_action(biz: dict = Depends(get_current_business)):
    m = await command_metrics(biz)
    context = (
        f"Business: {biz['name']} | Industry: {biz['industry']} | Area: {biz['service_area']}\n"
        f"Metrics: Growth {m['growth_score']}/100, SEO {m['seo_score']}/100, "
        f"Open leads {m['leads']}, Pipeline ${m['pipeline_value']}, Revenue ${m['revenue']}, "
        f"Rating {m['rating']} ({m['review_count']} reviews), Open jobs {m['jobs_open']}, "
        f"Outstanding invoices ${m['invoices_outstanding']}."
    )
    system = ("You are the Venturelyx growth strategist for small businesses. "
              "Speak in plain, owner-friendly English, never jargon. "
              "Return ONLY a JSON array of 4 objects, each: "
              '{"title": short, "why": one sentence in plain english, "module": one of '
              '["scaleseo","operate","reviews","command"], "impact": "high"|"medium"|"low"}. '
              "No markdown, no prose outside the JSON.")
    prompt = f"Given this business, list the 4 highest-impact next actions.\n{context}"
    provider, model = route("generation", biz.get("ai_provider_pref", "auto"))[0]
    try:
        raw = await complete_ai("generation", system, prompt, biz.get("ai_provider_pref", "auto"))
        import json, re
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        actions = json.loads(match.group(0)) if match else json.loads(raw)
        await db.ai_logs.insert_one({"id": str(uuid.uuid4()), "business_id": biz["id"],
                                     "provider": provider, "model": model,
                                     "task": "next_best_action", "created_at": now_iso()})
    except Exception:
        actions = _fallback_actions(m)
    return {"actions": actions[:4], "generated_by": f"{provider}:{model}"}


def _fallback_actions(m):
    actions = []
    if m["seo_score"] < 70:
        actions.append({"title": "Fix your website's SEO issues", "why": "We found things stopping customers from finding you online.", "module": "scaleseo", "impact": "high"})
    if m["review_count"] < 5:
        actions.append({"title": "Ask happy customers for reviews", "why": "More reviews build trust and win you new business.", "module": "reviews", "impact": "high"})
    if m["leads"] > 0:
        actions.append({"title": "Follow up on open leads", "why": f"You have {m['leads']} leads waiting in your pipeline.", "module": "operate", "impact": "medium"})
    if m["invoices_outstanding"] > 0:
        actions.append({"title": "Collect outstanding invoices", "why": f"${m['invoices_outstanding']:.0f} is owed to you right now.", "module": "operate", "impact": "high"})
    while len(actions) < 4:
        actions.append({"title": "Scan your website for growth opportunities", "why": "Keep your online presence strong.", "module": "scaleseo", "impact": "low"})
    return actions
