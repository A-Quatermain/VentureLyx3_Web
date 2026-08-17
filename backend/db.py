import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def clean(doc):
    """Strip Mongo _id from a document (or list of documents)."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [clean(d) for d in doc]
    doc.pop("_id", None)
    return doc
