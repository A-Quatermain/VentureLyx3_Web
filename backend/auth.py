import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field

from db import db, clean

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True,
                        secure=True, samesite="none", max_age=604800, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user = clean(user)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_business(user: dict = Depends(get_current_user)) -> dict:
    biz = await db.businesses.find_one({"owner_id": user["id"]})
    if not biz:
        raise HTTPException(status_code=404, detail="No business found. Complete onboarding first.")
    return clean(biz)


router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterInput(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


def _public_user(user: dict) -> dict:
    return {"id": user["id"], "name": user["name"], "email": user["email"],
            "role": user.get("role", "owner"), "org_id": user["org_id"]}


@router.post("/register")
async def register(data: RegisterInput, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    org_id = str(uuid.uuid4())
    user = {
        "id": str(uuid.uuid4()), "org_id": org_id, "name": data.name, "email": email,
        "password_hash": hash_password(data.password), "role": "owner",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(dict(user))
    await db.orgs.insert_one({"id": org_id, "name": f"{data.name}'s Org",
                              "created_at": datetime.now(timezone.utc).isoformat()})
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"token": token, "user": _public_user(user)}


@router.post("/login")
async def login(data: LoginInput, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"token": token, "user": _public_user(user)}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"success": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    biz = await db.businesses.find_one({"owner_id": user["id"]})
    return {"user": _public_user(user), "business": clean(biz)}
