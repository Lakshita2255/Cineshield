import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Request, HTTPException

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _secret() -> str:
    return os.environ.get("JWT_SECRET", "c1n3sh13ld_7f3a9b2e4d5c6a8f0e1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e")


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12)
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response, access: str, refresh: str):
    is_secure = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
    samesite = "none" if is_secure else "lax"
    response.set_cookie("access_token", access, httponly=True, secure=is_secure, samesite=samesite, max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=is_secure, samesite=samesite, max_age=604800, path="/")


async def get_current_user(request: Request) -> dict:
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection uninitialized")

    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def log_access_denied(db, user: dict, action: str, case_id: Optional[str] = None):
    await db.audit_events.insert_one({
        "id": f"AE-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "type": "access_denied",
        "case_id": case_id,
        "actor": user.get("name", "Unknown"),
        "actor_email": user.get("email", "Unknown"),
        "role": user.get("role", "Unknown"),
        "detail": f"Attempted '{action}' without required permission",
        "severity": "warning",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def require_role(request: Request, user: dict, roles: tuple, action: str, case_id: Optional[str] = None):
    if user.get("role") not in roles:
        await log_access_denied(request.app.state.db, user, action, case_id)
        raise HTTPException(status_code=403, detail=f"Requires role: {', '.join(roles)}")
