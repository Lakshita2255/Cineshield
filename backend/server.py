from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone, timedelta
import random
from contextlib import asynccontextmanager

from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, get_current_user, require_role, log_access_denied
)
from seed import seed_users, seed_data, WORKERS, MODEL

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Lifespan context manager for startup and shutdown
@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    try:
        await seed_users(db)
        await seed_data(db)
        logging.info("Database initialized and seeded successfully.")
    except Exception as e:
        logging.error(f"Error during startup seeding: {e}")
    yield
    client.close()

app = FastAPI(title="CineShield 2.0 API", lifespan=lifespan)
app.state.db = db

api_router = APIRouter(prefix="/api")

# CORS Configuration with origin regex for local dev ports
raw_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8001')
cors_origins = [o.strip() for o in raw_origins.split(',') if o.strip() and o.strip() != '*']

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins if cors_origins else ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://localhost:8001"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class DecisionRequest(BaseModel):
    action: str  # accept, reject, monitor, escalate, duplicate, request_evidence
    enforcement: Optional[str] = None  # takedown, monetize, mute, geoblock
    rationale: str
    reason_codes: Optional[List[str]] = []

class AssetRegisterRequest(BaseModel):
    title: str
    type: str
    owner: str
    isan: Optional[str] = None
    territories: List[str] = []
    release_window: Optional[Dict[str, str]] = None
    authorized_platforms: List[str] = []
    exceptions: List[str] = []

class CandidateIntakeRequest(BaseModel):
    urls: List[str]
    source_type: Optional[str] = "manual_upload"
    notes: Optional[str] = None

# --- AUTH ROUTES ---
@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    user = await db.users.find_one({"email": req.email.strip().lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(user["id"], user["email"], user["role"])
    refresh_token = create_refresh_token(user["id"])
    set_auth_cookies(response, access_token, refresh_token)
    
    user_data = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }
    return {"user": user_data, "access_token": access_token}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"]
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

# --- CASES ROUTES ---
@api_router.get("/cases")
async def get_cases(
    current_user: dict = Depends(get_current_user),
    search: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    rights_status: Optional[str] = None,
    source: Optional[str] = None,
    has_conflict: Optional[bool] = None,
    duplicate_group_id: Optional[str] = None,
    is_group_primary: Optional[bool] = None,
    sort_by: Optional[str] = "priority",
    sort_dir: Optional[str] = "desc",
    limit: int = 100,
    offset: int = 0
):
    query: Dict[str, Any] = {}
    if search:
        s = search.strip()
        query["$or"] = [
            {"id": {"$regex": s, "$options": "i"}},
            {"asset_title": {"$regex": s, "$options": "i"}},
            {"candidate_title": {"$regex": s, "$options": "i"}},
            {"candidate_id": {"$regex": s, "$options": "i"}},
            {"asset_owner": {"$regex": s, "$options": "i"}}
        ]
    if status and status != "all":
        query["status"] = status
    if severity and severity != "all":
        query["severity"] = severity
    if rights_status and rights_status != "all":
        query["rights_status"] = rights_status
    if source and source != "all":
        query["source"] = source
    if has_conflict is True:
        query["conflicting_signals"] = {"$exists": True, "$ne": []}
    if duplicate_group_id:
        query["duplicate_group_id"] = duplicate_group_id
    if is_group_primary is not None:
        query["is_group_primary"] = is_group_primary

    sort_direction = -1 if sort_dir == "desc" else 1
    sort_field = sort_by if sort_by in ["priority", "confidence", "coverage", "created_at", "urgency"] else "priority"

    cursor = db.cases.find(query, {"_id": 0}).sort(sort_field, sort_direction).skip(offset).limit(limit)
    cases = await cursor.to_list(length=limit)
    total = await db.cases.count_documents(query)

    return {"cases": cases, "total": total, "limit": limit, "offset": offset}

@api_router.get("/cases/{case_id}")
async def get_case_by_id(case_id: str, current_user: dict = Depends(get_current_user)):
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@api_router.post("/cases/{case_id}/decision")
async def record_decision(
    case_id: str,
    req: DecisionRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not req.rationale or len(req.rationale.strip()) < 5:
        raise HTTPException(status_code=400, detail="A detailed legal/operational rationale is required.")

    # Enforcement execution requires approver or admin role
    if req.enforcement or req.action == "accept":
        await require_role(request, current_user, ("approver", "admin"), action=f"execute_enforcement_{req.enforcement or 'accept'}", case_id=case_id)

    new_status = {
        "accept": "approved",
        "reject": "rejected",
        "monitor": "monitoring",
        "escalate": "escalated",
        "duplicate": "duplicate",
        "request_evidence": "needs_evidence"
    }.get(req.action, "in_review")

    now = datetime.now(timezone.utc).isoformat()
    update_doc = {
        "status": new_status,
        "decision_count": case.get("decision_count", 0) + 1,
        "last_decision": {
            "action": req.action,
            "enforcement": req.enforcement,
            "rationale": req.rationale,
            "reason_codes": req.reason_codes,
            "actor": current_user["name"],
            "actor_role": current_user["role"],
            "actor_email": current_user["email"],
            "timestamp": now
        },
        "enforcement_requested": req.enforcement,
        "enforcement_status": "pending_execution" if req.enforcement else None,
        "updated_at": now
    }

    await db.cases.update_one({"id": case_id}, {"$set": update_doc})

    # Log audit event
    audit_event = {
        "id": f"AE-DEC-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "type": "decision_recorded",
        "case_id": case_id,
        "actor": current_user["name"],
        "actor_email": current_user["email"],
        "role": current_user["role"],
        "detail": f"Action: {req.action.upper()} | Enforcement: {req.enforcement or 'None'} | Rationale: {req.rationale}",
        "severity": "info" if req.action != "accept" else "warning",
        "created_at": now
    }
    await db.audit_events.insert_one(audit_event)

    updated_case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    return updated_case

# --- CANDIDATES ROUTES ---
@api_router.get("/candidates")
async def get_candidates(current_user: dict = Depends(get_current_user)):
    candidates = await db.candidates.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return candidates

@api_router.post("/candidates/intake")
async def intake_candidates(req: CandidateIntakeRequest, current_user: dict = Depends(get_current_user)):
    if not req.urls:
        raise HTTPException(status_code=400, detail="At least one candidate URL is required")
    
    created_items = []
    now = datetime.now(timezone.utc).isoformat()
    for idx, url in enumerate(req.urls):
        cand_id = f"CND-{random.randint(6000, 9999)}"
        cand = {
            "id": cand_id,
            "title": f"Submitted Candidate Intake #{cand_id}",
            "source_type": req.source_type or "manual_upload",
            "url": url,
            "platform": "Unknown / Web",
            "ingestion_status": "processing",
            "submitted_by": current_user["email"],
            "case_id": None,
            "created_at": now,
            "media_url": None,
            "duration": 600
        }
        await db.candidates.insert_one(cand)
        created_items.append(cand_id)
        
    return {"message": f"Successfully ingested {len(created_items)} candidates", "candidate_ids": created_items}

# --- ASSETS ROUTES ---
@api_router.get("/assets")
async def get_assets(current_user: dict = Depends(get_current_user)):
    assets = await db.assets.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return assets

@api_router.post("/assets/register")
async def register_asset(req: AssetRegisterRequest, current_user: dict = Depends(get_current_user)):
    if not req.title or not req.owner:
        raise HTTPException(status_code=400, detail="Title and Owner are required")
    
    now = datetime.now(timezone.utc).isoformat()
    asset_id = f"AST-{random.randint(2000, 4999)}"
    doc = {
        "id": asset_id,
        "title": req.title,
        "type": req.type or "Feature film",
        "owner": req.owner,
        "territories": req.territories or ["US"],
        "release_window": req.release_window or {"start": "2026-01-01", "end": "2026-12-31"},
        "authorized_platforms": req.authorized_platforms or ["YouTube"],
        "exceptions": req.exceptions or [],
        "validation_state": "valid" if req.isan else "incomplete",
        "missing_fields": [] if req.isan else ["ISAN code declaration"],
        "isan": req.isan,
        "media_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "duration": 596,
        "fingerprint_status": "ready",
        "fingerprint_progress": 100,
        "fingerprint_version": MODEL["fingerprint_version"],
        "reference_type": "upload",
        "created_at": now
    }
    await db.assets.insert_one(doc)
    
    # Audit log
    await db.audit_events.insert_one({
        "id": f"AE-AST-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "type": "asset_registered",
        "case_id": None,
        "actor": current_user["name"],
        "actor_email": current_user["email"],
        "role": current_user["role"],
        "detail": f"Registered new protected asset '{req.title}' ({asset_id})",
        "severity": "info",
        "created_at": now
    })
    
    return doc

# --- JOBS ROUTES ---
@api_router.get("/jobs")
async def get_jobs(current_user: dict = Depends(get_current_user)):
    jobs = await db.jobs.find({}, {"_id": 0}).sort("started_at", -1).to_list(100)
    return jobs

# --- AUDIT ROUTES ---
@api_router.get("/audit")
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    events = await db.audit_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return events

# --- WORKERS & SYSTEM STATUS ---
@api_router.get("/workers")
async def get_workers(current_user: dict = Depends(get_current_user)):
    return {"workers": WORKERS, "model": MODEL}

# Status route
@api_router.get("/status")
async def status_check():
    return {"status": "ok", "app": "CineShield 2.0 Backend", "timestamp": datetime.now(timezone.utc).isoformat()}

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
