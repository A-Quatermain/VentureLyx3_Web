import os
import logging
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from db import db
import auth
import routes_business
import routes_operate
import routes_seo
import routes_reviews
import routes_ai
import routes_payments
from seed import seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("venturelyx")

app = FastAPI(title="Venturelyx API")


@app.get("/api/")
async def root():
    return {"message": "Venturelyx API", "status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


app.include_router(auth.router)
app.include_router(routes_business.router)
app.include_router(routes_operate.router)
app.include_router(routes_seo.router)
app.include_router(routes_reviews.router)
app.include_router(routes_ai.router)
app.include_router(routes_payments.router)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await seed()
        logger.info("Seed complete")
    except Exception as e:
        logger.error(f"Seed error: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    db.client.close()
