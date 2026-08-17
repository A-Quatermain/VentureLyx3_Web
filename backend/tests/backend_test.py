"""
Venturelyx backend API tests.
Covers: auth, business onboarding, command center, operate (leads/jobs/invoices),
scaleseo (scan/keywords/competitors), reviews, payments, AI streaming, tenant scoping.
"""
import os
import re
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


# --------- Fixtures ---------
@pytest.fixture(scope="session")
def test_credentials():
    p = Path("/app/memory/test_credentials.md")
    content = p.read_text()
    e = re.search(r"Email:\s*(\S+)", content).group(1)
    pw = re.search(r"Password:\s*(\S+)", content).group(1)
    return {"email": e, "password": pw}


@pytest.fixture(scope="session")
def owner_client(test_credentials):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=test_credentials, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Seed owner login failed: {r.status_code} {r.text[:300]}")
    token = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def new_user_client():
    """Register a brand new user (fresh tenant) for isolation tests."""
    s = requests.Session()
    email = f"TEST_qa_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"name": "QA Tester", "email": email, "password": "QAtest12345"}, timeout=30)
    assert r.status_code == 200, f"register failed {r.status_code} {r.text}"
    token = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    s.email = email
    return s


# --------- Auth ---------
class TestAuth:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "healthy"

    def test_seed_owner_login_returns_token_and_cookie(self, test_credentials):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=test_credentials, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data.get("token"), str) and len(data["token"]) > 20
        assert data["user"]["email"] == test_credentials["email"]
        # httpOnly cookie set
        cookies = r.cookies.get_dict()
        assert "access_token" in cookies

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "nope@example.com", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_register_login_logout_flow(self):
        s = requests.Session()
        email = f"TEST_flow_{uuid.uuid4().hex[:8]}@example.com"
        pw = "FlowTest12345"
        r = s.post(f"{BASE_URL}/api/auth/register",
                   json={"name": "Flow", "email": email, "password": pw}, timeout=30)
        assert r.status_code == 200
        token = r.json()["token"]
        # /me works
        me = s.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert me.status_code == 200
        assert me.json()["user"]["email"] == email.lower()
        # New user has no business yet
        assert me.json().get("business") in (None, {}, [])
        # logout
        lo = s.post(f"{BASE_URL}/api/auth/logout", timeout=15)
        assert lo.status_code == 200
        # login again
        r2 = s.post(f"{BASE_URL}/api/auth/login",
                    json={"email": email, "password": pw}, timeout=15)
        assert r2.status_code == 200

    def test_me_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401


# --------- Onboarding & Command Center ---------
class TestOnboardingAndCommand:
    def test_new_user_no_business_returns_404_on_metrics(self, new_user_client):
        r = new_user_client.get(f"{BASE_URL}/api/command/metrics", timeout=15)
        assert r.status_code == 404

    def test_onboard_then_command_metrics(self, new_user_client):
        r = new_user_client.post(f"{BASE_URL}/api/business/onboard",
                                 json={"name": "TEST_Biz", "industry": "Services",
                                       "service_area": "Austin, TX", "website": ""}, timeout=15)
        assert r.status_code == 200
        biz = r.json()
        assert biz["name"] == "TEST_Biz"
        assert "id" in biz and "_id" not in biz

        # metrics
        m = new_user_client.get(f"{BASE_URL}/api/command/metrics", timeout=15)
        assert m.status_code == 200
        md = m.json()
        for k in ["revenue", "leads", "pipeline_value", "seo_score",
                  "rating", "growth_score", "customers"]:
            assert k in md
        # empty workspace: no revenue, no leads
        assert md["revenue"] == 0
        assert md["leads"] == 0
        assert md["review_count"] == 0

    def test_next_best_action(self, owner_client):
        r = owner_client.get(f"{BASE_URL}/api/command/next-best-action", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get("actions"), list) and len(d["actions"]) > 0
        for a in d["actions"]:
            assert "title" in a and "module" in a


# --------- Operate ---------
class TestOperate:
    lead_id = None
    job_id = None
    invoice_id = None

    def test_create_lead_and_persistence(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/operate/leads",
                              json={"name": "TEST_Lead_A", "email": "a@x.com",
                                    "stage": "new", "value": 1500}, timeout=15)
        assert r.status_code == 200
        lead = r.json()
        assert lead["stage"] == "new" and lead["value"] == 1500
        TestOperate.lead_id = lead["id"]
        leads = owner_client.get(f"{BASE_URL}/api/operate/leads", timeout=15).json()
        assert any(l["id"] == lead["id"] for l in leads)

    def test_update_lead_stage_moves_pipeline(self, owner_client):
        assert TestOperate.lead_id
        r = owner_client.put(f"{BASE_URL}/api/operate/leads/{TestOperate.lead_id}",
                             json={"stage": "qualified"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["stage"] == "qualified"

    def test_delete_lead(self, owner_client):
        assert TestOperate.lead_id
        r = owner_client.delete(f"{BASE_URL}/api/operate/leads/{TestOperate.lead_id}", timeout=15)
        assert r.status_code == 200

    def test_job_crud(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/operate/jobs",
                              json={"title": "TEST_Job", "customer_name": "Bob",
                                    "status": "scheduled", "value": 200}, timeout=15)
        assert r.status_code == 200
        jid = r.json()["id"]
        u = owner_client.put(f"{BASE_URL}/api/operate/jobs/{jid}",
                             json={"title": "TEST_Job", "status": "completed", "value": 200}, timeout=15)
        assert u.status_code == 200 and u.json()["status"] == "completed"
        d = owner_client.delete(f"{BASE_URL}/api/operate/jobs/{jid}", timeout=15)
        assert d.status_code == 200

    def test_invoice_create_and_checkout(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/operate/invoices",
                              json={"customer_name": "TEST_Cust", "customer_email": "c@x.com",
                                    "items": [{"description": "svc a", "amount": 100},
                                              {"description": "svc b", "amount": 50.5}]}, timeout=15)
        assert r.status_code == 200
        inv = r.json()
        assert round(inv["amount"], 2) == 150.5
        assert inv["status"] == "draft"
        assert inv["number"].startswith("INV-")
        TestOperate.invoice_id = inv["id"]

        # Checkout
        co = owner_client.post(f"{BASE_URL}/api/payments/checkout",
                               json={"invoice_id": inv["id"],
                                     "origin_url": "https://example.com"}, timeout=30)
        assert co.status_code == 200, co.text
        body = co.json()
        assert body.get("checkout_url", "").startswith("https://checkout.stripe.com")
        assert body.get("session_id")

        # invoice status now 'sent'
        after = owner_client.get(f"{BASE_URL}/api/operate/invoices", timeout=15).json()
        u = next(i for i in after if i["id"] == inv["id"])
        assert u["status"] == "sent"

        # payment status endpoint
        st = owner_client.get(f"{BASE_URL}/api/payments/status/{body['session_id']}", timeout=30)
        assert st.status_code == 200
        assert st.json()["payment_status"] in ("pending", "paid", "unpaid")

    def test_invoice_delete_cleanup(self, owner_client):
        if TestOperate.invoice_id:
            owner_client.delete(f"{BASE_URL}/api/operate/invoices/{TestOperate.invoice_id}", timeout=15)


# --------- SEO ---------
class TestSEO:
    def test_scan_public_url(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/seo/scan",
                              json={"url": "https://example.com"}, timeout=45)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d["score"], int) and 0 <= d["score"] <= 100
        assert isinstance(d["checks"], list) and len(d["checks"]) >= 6
        assert isinstance(d["issues"], list)

    def test_scan_private_url_rejected(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/seo/scan",
                              json={"url": "http://127.0.0.1"}, timeout=15)
        assert r.status_code == 400
        assert "private" in r.text.lower() or "blocked" in r.text.lower() or "invalid" in r.text.lower()

    def test_scan_localhost_rejected(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/seo/scan",
                              json={"url": "http://localhost"}, timeout=15)
        assert r.status_code == 400

    def test_keyword_crud(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/seo/keywords",
                              json={"keyword": "TEST_pool cleaning austin",
                                    "position": 5, "volume": 200, "difficulty": 30}, timeout=15)
        assert r.status_code == 200
        kid = r.json()["id"]
        lst = owner_client.get(f"{BASE_URL}/api/seo/keywords", timeout=15).json()
        assert any(k["id"] == kid for k in lst)
        d = owner_client.delete(f"{BASE_URL}/api/seo/keywords/{kid}", timeout=15)
        assert d.status_code == 200

    def test_competitor_crud(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/seo/competitors",
                              json={"name": "TEST_Rival", "domain": "rival.com", "score": 60}, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        lst = owner_client.get(f"{BASE_URL}/api/seo/competitors", timeout=15).json()
        assert any(c["id"] == cid for c in lst)
        d = owner_client.delete(f"{BASE_URL}/api/seo/competitors/{cid}", timeout=15)
        assert d.status_code == 200

    def test_audits_history(self, owner_client):
        r = owner_client.get(f"{BASE_URL}/api/seo/audits", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --------- Reviews ---------
class TestReviews:
    def test_list_seeded_reviews(self, owner_client):
        r = owner_client.get(f"{BASE_URL}/api/reviews", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "reviews" in d and "rating" in d and "trend" in d
        assert d["count"] >= 0

    def test_add_and_respond(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/reviews",
                              json={"author": "TEST_Rev", "rating": 5, "text": "Great!"}, timeout=15)
        assert r.status_code == 200
        rid = r.json()["id"]
        resp = owner_client.put(f"{BASE_URL}/api/reviews/{rid}/response",
                                json={"response": "Thanks!"}, timeout=15)
        assert resp.status_code == 200
        assert resp.json()["responded"] is True
        assert resp.json()["ai_response"] == "Thanks!"
        # cleanup
        owner_client.delete(f"{BASE_URL}/api/reviews/{rid}", timeout=15)

    def test_review_request_log(self, owner_client):
        r = owner_client.post(f"{BASE_URL}/api/reviews/requests",
                              json={"customer_name": "TEST_Req", "channel": "email",
                                    "contact": "x@y.com"}, timeout=15)
        assert r.status_code == 200
        lst = owner_client.get(f"{BASE_URL}/api/reviews/requests", timeout=15).json()
        assert any(x["customer_name"] == "TEST_Req" for x in lst)


# --------- AI Streaming ---------
class TestAI:
    def test_seo_recommend_streams(self, owner_client):
        with owner_client.post(f"{BASE_URL}/api/ai/seo/recommend",
                               json={"issue_label": "Page title", "detail": "No title tag",
                                     "recommendation": "Add a title"},
                               stream=True, timeout=90) as r:
            assert r.status_code == 200
            content = b""
            for chunk in r.iter_content(chunk_size=256):
                content += chunk
                if len(content) > 40:
                    break
            assert len(content) > 0

    def test_reviews_respond_streams(self, owner_client):
        with owner_client.post(f"{BASE_URL}/api/ai/reviews/respond",
                               json={"author": "Amy", "rating": 5, "text": "Loved it"},
                               stream=True, timeout=90) as r:
            assert r.status_code == 200
            content = b""
            for chunk in r.iter_content(chunk_size=256):
                content += chunk
                if len(content) > 40:
                    break
            assert len(content) > 0


# --------- Tenant scoping ---------
class TestTenantScoping:
    def test_new_user_sees_empty_data(self, new_user_client):
        # ensure onboarded (may already be from earlier test); if not, onboard
        me = new_user_client.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        if not me.get("business"):
            new_user_client.post(f"{BASE_URL}/api/business/onboard",
                                 json={"name": "TEST_Scoped", "industry": "Services",
                                       "service_area": "Austin, TX"}, timeout=15)
        leads = new_user_client.get(f"{BASE_URL}/api/operate/leads", timeout=15).json()
        jobs = new_user_client.get(f"{BASE_URL}/api/operate/jobs", timeout=15).json()
        invs = new_user_client.get(f"{BASE_URL}/api/operate/invoices", timeout=15).json()
        revs = new_user_client.get(f"{BASE_URL}/api/reviews", timeout=15).json()
        # Should not show seeded owner's demo data
        assert leads == [] or all("business_id" not in l for l in leads)
        assert jobs == []
        assert invs == []
        assert revs["count"] == 0


# --------- Settings ---------
class TestSettings:
    def test_update_business_settings(self, owner_client):
        r = owner_client.put(f"{BASE_URL}/api/business",
                             json={"ai_provider_pref": "auto"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["ai_provider_pref"] == "auto"
