import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

from db import db, clean
from auth import get_current_business

router = APIRouter(prefix="/api/operate", tags=["operate"])

STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------- Leads / CRM ----------
class LeadInput(BaseModel):
    name: str = Field(min_length=1)
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    stage: str = "new"
    value: float = 0
    source: Optional[str] = "manual"
    notes: Optional[str] = ""


@router.get("/leads")
async def list_leads(biz: dict = Depends(get_current_business)):
    leads = await db.leads.find({"business_id": biz["id"]}).sort("created_at", -1).to_list(1000)
    return clean(leads)


@router.post("/leads")
async def create_lead(data: LeadInput, biz: dict = Depends(get_current_business)):
    doc = data.model_dump()
    doc.update({"id": str(uuid.uuid4()), "business_id": biz["id"],
                "created_at": now_iso(), "updated_at": now_iso()})
    await db.leads.insert_one(dict(doc))
    return clean(doc)


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    stage: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, data: LeadUpdate, biz: dict = Depends(get_current_business)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    res = await db.leads.update_one({"id": lead_id, "business_id": biz["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Lead not found")
    lead = clean(await db.leads.find_one({"id": lead_id}))
    if lead["stage"] == "won" and not await db.customers.find_one({"lead_id": lead_id}):
        await db.customers.insert_one({"id": str(uuid.uuid4()), "business_id": biz["id"],
                                       "lead_id": lead_id, "name": lead["name"],
                                       "email": lead.get("email", ""), "created_at": now_iso()})
    return lead


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, biz: dict = Depends(get_current_business)):
    await db.leads.delete_one({"id": lead_id, "business_id": biz["id"]})
    return {"success": True}


# ---------- Jobs ----------
class JobInput(BaseModel):
    title: str = Field(min_length=1)
    customer_name: Optional[str] = ""
    status: str = "scheduled"
    scheduled_date: Optional[str] = ""
    value: float = 0
    notes: Optional[str] = ""


@router.get("/jobs")
async def list_jobs(biz: dict = Depends(get_current_business)):
    return clean(await db.jobs.find({"business_id": biz["id"]}).sort("scheduled_date", 1).to_list(1000))


@router.post("/jobs")
async def create_job(data: JobInput, biz: dict = Depends(get_current_business)):
    doc = data.model_dump()
    doc.update({"id": str(uuid.uuid4()), "business_id": biz["id"], "created_at": now_iso()})
    await db.jobs.insert_one(dict(doc))
    return clean(doc)


@router.put("/jobs/{job_id}")
async def update_job(job_id: str, data: JobInput, biz: dict = Depends(get_current_business)):
    res = await db.jobs.update_one({"id": job_id, "business_id": biz["id"]}, {"$set": data.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Job not found")
    return clean(await db.jobs.find_one({"id": job_id}))


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, biz: dict = Depends(get_current_business)):
    await db.jobs.delete_one({"id": job_id, "business_id": biz["id"]})
    return {"success": True}


# ---------- Invoices ----------
class InvoiceItem(BaseModel):
    description: str
    amount: float


class InvoiceInput(BaseModel):
    customer_name: str = Field(min_length=1)
    customer_email: Optional[str] = ""
    items: List[InvoiceItem]


@router.get("/invoices")
async def list_invoices(biz: dict = Depends(get_current_business)):
    return clean(await db.invoices.find({"business_id": biz["id"]}).sort("created_at", -1).to_list(1000))


@router.post("/invoices")
async def create_invoice(data: InvoiceInput, biz: dict = Depends(get_current_business)):
    count = await db.invoices.count_documents({"business_id": biz["id"]})
    amount = round(sum(i.amount for i in data.items), 2)
    doc = {"id": str(uuid.uuid4()), "business_id": biz["id"],
           "number": f"INV-{1001 + count}", "customer_name": data.customer_name,
           "customer_email": data.customer_email or "",
           "items": [i.model_dump() for i in data.items], "amount": amount,
           "status": "draft", "stripe_session_id": None, "created_at": now_iso()}
    await db.invoices.insert_one(dict(doc))
    return clean(doc)


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, biz: dict = Depends(get_current_business)):
    await db.invoices.delete_one({"id": invoice_id, "business_id": biz["id"]})
    return {"success": True}
