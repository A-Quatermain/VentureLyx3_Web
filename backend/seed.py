import os
import uuid
from datetime import datetime, timezone, timedelta
from db import db
from auth import hash_password, verify_password


def iso(dt=None):
    return (dt or datetime.now(timezone.utc)).isoformat()


async def seed():
    await db.users.create_index("email", unique=True)
    await db.leads.create_index("business_id")
    await db.invoices.create_index("business_id")

    email = os.environ.get("ADMIN_EMAIL", "owner@venturelyx.com").lower()
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    user = await db.users.find_one({"email": email})
    if user is None:
        org_id = str(uuid.uuid4())
        uid = str(uuid.uuid4())
        await db.users.insert_one({"id": uid, "org_id": org_id, "name": "Sara",
                                   "email": email, "password_hash": hash_password(password),
                                   "role": "owner", "created_at": iso()})
        await db.orgs.insert_one({"id": org_id, "name": "Sara's Org", "created_at": iso()})
        user = await db.users.find_one({"email": email})
    elif not verify_password(password, user["password_hash"]):
        await db.users.update_one({"email": email},
                                  {"$set": {"password_hash": hash_password(password)}})

    # Seed a demo business + sample data once
    biz = await db.businesses.find_one({"owner_id": user["id"]})
    if biz is None:
        bid = str(uuid.uuid4())
        await db.businesses.insert_one({
            "id": bid, "org_id": user["org_id"], "owner_id": user["id"],
            "name": "Blue Ridge Pools & Spa", "website": "https://example.com",
            "industry": "Pool Service & Repair", "service_area": "Austin, TX",
            "ai_provider_pref": "auto", "created_at": iso(),
        })
        leads = [
            ("Marcus Reed", "marcus@example.com", "new", 4200, "Website form"),
            ("Elena Torres", "elena@example.com", "contacted", 6800, "Google"),
            ("Priya Nair", "priya@example.com", "qualified", 3100, "Referral"),
            ("Tom Becker", "tom@example.com", "proposal", 9500, "Website form"),
            ("Dana White", "dana@example.com", "won", 5200, "Referral"),
        ]
        for n, e, stage, val, src in leads:
            await db.leads.insert_one({"id": str(uuid.uuid4()), "business_id": bid, "name": n,
                                       "email": e, "phone": "", "company": "", "stage": stage,
                                       "value": val, "source": src, "notes": "",
                                       "created_at": iso(), "updated_at": iso()})
        for title, cust, status, val, days in [
            ("Weekly pool cleaning", "Dana White", "scheduled", 180, 2),
            ("Pump replacement", "Tom Becker", "in_progress", 950, 0),
            ("Spa heater repair", "Elena Torres", "completed", 420, -3)]:
            await db.jobs.insert_one({"id": str(uuid.uuid4()), "business_id": bid, "title": title,
                                      "customer_name": cust, "status": status, "value": val,
                                      "scheduled_date": iso(datetime.now(timezone.utc) + timedelta(days=days))[:10],
                                      "notes": "", "created_at": iso()})
        await db.invoices.insert_one({"id": str(uuid.uuid4()), "business_id": bid, "number": "INV-1001",
                                      "customer_name": "Dana White", "customer_email": "dana@example.com",
                                      "items": [{"description": "Monthly pool service", "amount": 220.0}],
                                      "amount": 220.0, "status": "paid", "stripe_session_id": None,
                                      "created_at": iso()})
        for author, rating, text in [
            ("Jenna M.", 5, "Best pool service in Austin! Always on time."),
            ("Carlos R.", 4, "Great work, though scheduling took a couple tries."),
            ("Wendy P.", 5, "They fixed our heater same day. Lifesavers.")]:
            await db.reviews.insert_one({"id": str(uuid.uuid4()), "business_id": bid, "author": author,
                                         "rating": rating, "text": text, "source": "Google",
                                         "responded": False, "ai_response": "", "created_at": iso()})
        for kw, pos, vol, diff in [("pool cleaning austin", 8, 1300, 42),
                                   ("spa repair austin tx", 14, 480, 35),
                                   ("pool pump replacement", 22, 720, 51)]:
            await db.keywords.insert_one({"id": str(uuid.uuid4()), "business_id": bid, "keyword": kw,
                                          "position": pos, "volume": vol, "difficulty": diff, "created_at": iso()})
        await db.competitors.insert_one({"id": str(uuid.uuid4()), "business_id": bid,
                                         "name": "AquaPro Austin", "domain": "aquapro.example.com",
                                         "score": 78, "notes": "Strong local rankings", "created_at": iso()})
