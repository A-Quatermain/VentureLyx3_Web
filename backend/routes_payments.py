import os
from datetime import datetime, timezone
import stripe
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel

from db import db, clean
from auth import get_current_business

router = APIRouter(prefix="/api", tags=["payments"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")


def now():
    return datetime.now(timezone.utc)


class CheckoutInput(BaseModel):
    invoice_id: str
    origin_url: str


@router.post("/payments/checkout")
async def checkout(data: CheckoutInput, biz: dict = Depends(get_current_business)):
    inv = await db.invoices.find_one({"id": data.invoice_id, "business_id": biz["id"]})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv["amount"] <= 0:
        raise HTTPException(400, "Invoice amount must be greater than zero")
    session = stripe.checkout.Session.create(
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": f"Invoice {inv['number']} — {biz['name']}"},
                "unit_amount": int(round(inv["amount"] * 100)),
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{data.origin_url}/payment/cancel",
        metadata={"invoice_id": inv["id"], "business_id": biz["id"]},
    )
    await db.payment_transactions.insert_one({
        "session_id": session.id, "invoice_id": inv["id"], "business_id": biz["id"],
        "amount": inv["amount"], "currency": "usd",
        "status": "initiated", "payment_status": "pending",
        "created_at": now(), "updated_at": now(),
    })
    await db.invoices.update_one({"id": inv["id"]},
                                 {"$set": {"status": "sent", "stripe_session_id": session.id}})
    return {"checkout_url": session.url, "session_id": session.id}


async def _mark_paid(session_id):
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if tx and tx.get("invoice_id"):
        await db.invoices.update_one({"id": tx["invoice_id"]}, {"$set": {"status": "paid"}})


@router.get("/payments/status/{session_id}")
async def status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(404, "Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now()}})
                await _mark_paid(session_id)
                record = await db.payment_transactions.find_one({"session_id": session_id})
        except stripe.error.StripeError:
            pass
    return {"session_id": record["session_id"], "status": record["status"],
            "payment_status": record["payment_status"]}


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": obj.get("payment_status", "paid"),
                      "updated_at": now()}})
        await _mark_paid(obj["id"])
    return {"status": "ok"}
