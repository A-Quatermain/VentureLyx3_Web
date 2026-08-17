import uuid
import time
import socket
import ipaddress
from urllib.parse import urlparse, urljoin
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import httpx
from bs4 import BeautifulSoup

from db import db, clean
from auth import get_current_business

router = APIRouter(prefix="/api/seo", tags=["scaleseo"])


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def is_safe_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    try:
        infos = socket.getaddrinfo(parsed.hostname, None)
    except Exception:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
            return False
    return True


class ScanInput(BaseModel):
    url: str = Field(min_length=3)


def _check(cid, label, ok, detail, severity, recommendation):
    return {"id": cid, "label": label, "status": "pass" if ok else "fail",
            "detail": detail, "severity": severity, "recommendation": recommendation}


@router.post("/scan")
async def scan(data: ScanInput, biz: dict = Depends(get_current_business)):
    url = data.url.strip()
    if not url.startswith("http"):
        url = "https://" + url
    if not is_safe_url(url):
        raise HTTPException(400, "That URL can't be scanned (private or invalid address blocked for security).")

    checks = []
    try:
        start = time.time()
        async with httpx.AsyncClient(follow_redirects=True, timeout=15,
                                     headers={"User-Agent": "VenturelyxBot/1.0"}) as cx:
            resp = await cx.get(url)
        elapsed = round((time.time() - start) * 1000)
        html = resp.text
        soup = BeautifulSoup(html, "html.parser")
    except Exception as e:
        raise HTTPException(400, f"Couldn't reach that website: {e}")

    # HTTPS
    checks.append(_check("https", "Secure connection (HTTPS)", url.startswith("https"),
                         "Your site uses HTTPS." if url.startswith("https") else "No HTTPS detected.",
                         "high", "Install an SSL certificate so visitors and Google trust your site."))
    # Title
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    ok = 10 <= len(title) <= 65
    checks.append(_check("title", "Page title", ok,
                         f"Title is {len(title)} characters." if title else "No title tag found.",
                         "high", "Write a clear 50-60 character title with your main service and city."))
    # Meta description
    md = soup.find("meta", attrs={"name": "description"})
    md_content = md.get("content", "").strip() if md else ""
    ok = 50 <= len(md_content) <= 165
    checks.append(_check("meta", "Meta description", ok,
                         f"Description is {len(md_content)} characters." if md_content else "No meta description found.",
                         "medium", "Add a 150-character summary that makes people want to click from Google."))
    # H1
    h1s = soup.find_all("h1")
    ok = len(h1s) == 1
    checks.append(_check("h1", "Main heading (H1)", ok,
                         f"Found {len(h1s)} H1 headings." if h1s else "No H1 heading found.",
                         "medium", "Use exactly one H1 that describes what the page is about."))
    # Image alt
    imgs = soup.find_all("img")
    with_alt = [i for i in imgs if i.get("alt")]
    ratio = (len(with_alt) / len(imgs)) if imgs else 1
    ok = ratio >= 0.8
    checks.append(_check("alt", "Image descriptions (alt text)", ok,
                         f"{len(with_alt)} of {len(imgs)} images have alt text." if imgs else "No images found.",
                         "low", "Describe every image so Google and screen readers understand them."))
    # Canonical
    canonical = soup.find("link", attrs={"rel": "canonical"})
    checks.append(_check("canonical", "Canonical URL", bool(canonical),
                         "Canonical tag present." if canonical else "No canonical tag.",
                         "low", "Add a canonical tag to avoid duplicate-content confusion."))
    # Response time
    ok = elapsed < 1500
    checks.append(_check("speed", "Page load speed", ok,
                         f"Server responded in {elapsed} ms.",
                         "medium", "Aim for under 1.5s. Compress images and enable caching."))
    # Viewport / mobile
    vp = soup.find("meta", attrs={"name": "viewport"})
    checks.append(_check("mobile", "Mobile friendly", bool(vp),
                         "Viewport meta present." if vp else "No viewport meta tag.",
                         "medium", "Add a viewport meta tag so your site works on phones."))

    weights = {"high": 25, "medium": 15, "low": 8}
    total = sum(weights[c["severity"]] for c in checks)
    earned = sum(weights[c["severity"]] for c in checks if c["status"] == "pass")
    score = round(earned / total * 100) if total else 0
    issues = [c for c in checks if c["status"] == "fail"]
    sev_order = {"high": 0, "medium": 1, "low": 2}
    issues.sort(key=lambda c: sev_order[c["severity"]])

    audit = {"id": str(uuid.uuid4()), "business_id": biz["id"], "url": url,
             "score": score, "checks": checks, "issues": issues,
             "issues_count": len(issues), "response_ms": elapsed, "created_at": now_iso()}
    await db.seo_audits.insert_one(dict(audit))
    return clean(audit)


@router.get("/audits")
async def audits(biz: dict = Depends(get_current_business)):
    return clean(await db.seo_audits.find({"business_id": biz["id"]}).sort("created_at", -1).to_list(50))


# ---------- Keywords ----------
class KeywordInput(BaseModel):
    keyword: str = Field(min_length=1)
    position: Optional[int] = 0
    volume: Optional[int] = 0
    difficulty: Optional[int] = 0


@router.get("/keywords")
async def list_keywords(biz: dict = Depends(get_current_business)):
    return clean(await db.keywords.find({"business_id": biz["id"]}).sort("created_at", -1).to_list(500))


@router.post("/keywords")
async def add_keyword(data: KeywordInput, biz: dict = Depends(get_current_business)):
    doc = data.model_dump()
    doc.update({"id": str(uuid.uuid4()), "business_id": biz["id"], "created_at": now_iso()})
    await db.keywords.insert_one(dict(doc))
    return clean(doc)


@router.delete("/keywords/{kid}")
async def del_keyword(kid: str, biz: dict = Depends(get_current_business)):
    await db.keywords.delete_one({"id": kid, "business_id": biz["id"]})
    return {"success": True}


# ---------- Competitors ----------
class CompetitorInput(BaseModel):
    name: str = Field(min_length=1)
    domain: Optional[str] = ""
    score: Optional[int] = 0
    notes: Optional[str] = ""


@router.get("/competitors")
async def list_competitors(biz: dict = Depends(get_current_business)):
    return clean(await db.competitors.find({"business_id": biz["id"]}).sort("created_at", -1).to_list(200))


@router.post("/competitors")
async def add_competitor(data: CompetitorInput, biz: dict = Depends(get_current_business)):
    doc = data.model_dump()
    doc.update({"id": str(uuid.uuid4()), "business_id": biz["id"], "created_at": now_iso()})
    await db.competitors.insert_one(dict(doc))
    return clean(doc)


@router.delete("/competitors/{cid}")
async def del_competitor(cid: str, biz: dict = Depends(get_current_business)):
    await db.competitors.delete_one({"id": cid, "business_id": biz["id"]})
    return {"success": True}
