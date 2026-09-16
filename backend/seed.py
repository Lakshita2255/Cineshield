import os
import random
from datetime import datetime, timezone, timedelta
from auth import hash_password, verify_password

GCS = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/"
VIDEOS = [
    ("BigBuckBunny.mp4", 596), ("ElephantsDream.mp4", 653), ("Sintel.mp4", 888), ("TearsOfSteel.mp4", 734),
    ("SubaruOutbackOnStreetAndDirt.mp4", 594), ("VolkswagenGTIReview.mp4", 621),
    ("WhatCarCanYouGetForAGrand.mp4", 597), ("WeAreGoingOnBullrun.mp4", 47),
]

PLATFORMS = ["YouTube", "TikTok", "Telegram", "Dailymotion", "Bilibili", "Odysee", "Facebook", "Rumble", "VK Video", "Instagram"]

TRANSFORMS = [
    "Speed shift 1.08x", "Horizontal crop 12%", "Horizontal mirror", "Pitch shift +2 semitones",
    "Picture-in-picture overlay", "Color grade / LUT applied", "Re-encoded to 480p", "Watermark overlay (bottom-right)",
    "Audio replaced with commentary", "Letterbox borders added", "Frame-rate 30→24 conversion", "Burned-in subtitles",
    "Zoom 1.15x with pan", "Split-screen reaction layout",
]

REASON_CODES = {
    "RC-VIS-HIGH": "Visual fingerprint match above threshold",
    "RC-VIS-LOW": "Visual fingerprint below threshold",
    "RC-AUD-HIGH": "Audio fingerprint match above threshold",
    "RC-AUD-LOW": "Audio fingerprint below threshold",
    "RC-TEMP-ALIGN": "Temporal alignment consistent across segments",
    "RC-COV-PARTIAL": "Partial coverage (<40%) of protected asset",
    "RC-COV-HIGH": "High coverage (>70%) of protected asset",
    "RC-RIGHTS-GAP": "Rights metadata incomplete for territory",
    "RC-DUP-NEAR": "Near-duplicate of existing case",
    "RC-NOVEL-TRANSFORM": "Novel transformation pattern detected",
    "RC-PLATFORM-AUTH": "Candidate hosted on an authorized platform — verify license window",
    "RC-MEDIA-UNAVAIL": "Candidate media unavailable at fetch time",
    "RC-SPEED": "Speed alteration detected",
    "RC-RELEASE-WINDOW": "Candidate published inside exclusive release window",
}

ASSETS = [
    {"title": "Ashfall Protocol", "type": "Feature film", "owner": "Meridian Pictures", "territories": ["US", "CA", "UK", "DE", "FR"],
     "release_window": {"start": "2026-03-14", "end": "2026-09-14"}, "authorized_platforms": ["Meridian+", "Apple TV", "Prime Video"],
     "exceptions": ["Trailer excerpts ≤ 90s permitted for press"], "validation_state": "valid", "isan": "0000-0003-9F2A-0000-K-0000-0000-3", "video": 0},
    {"title": "Northern Lights — S2E04 'Whiteout'", "type": "Episodic", "owner": "Borealis Studios", "territories": ["US", "NO", "SE", "DK", "FI"],
     "release_window": {"start": "2026-05-02", "end": "2027-05-02"}, "authorized_platforms": ["Borealis Stream", "Hulu"],
     "exceptions": [], "validation_state": "valid", "isan": "0000-0004-1B7C-0000-V-0000-0000-8", "video": 1},
    {"title": "Glass Harbor", "type": "Feature film", "owner": "Harbor Light Films", "territories": ["US"],
     "release_window": {"start": "2026-01-20", "end": "2026-07-20"}, "authorized_platforms": ["Netflix"],
     "exceptions": ["Educational fair-use clips ≤ 30s"], "validation_state": "incomplete", "isan": None, "video": 2,
     "missing_fields": ["territories outside US", "sub-licensing agreements"]},
    {"title": "Meridian — Official Trailer", "type": "Trailer", "owner": "Meridian Pictures", "territories": ["Worldwide"],
     "release_window": {"start": "2026-02-01", "end": "2026-12-31"}, "authorized_platforms": ["YouTube", "Meridian+", "TikTok"],
     "exceptions": ["Embedding permitted on press outlets"], "validation_state": "valid", "isan": "0000-0003-9F2A-0000-T-0000-0000-1", "video": 7},
    {"title": "The Long Silence", "type": "Documentary", "owner": "Quiet Hours Collective", "territories": ["UK", "IE", "AU", "NZ"],
     "release_window": {"start": "2025-11-10", "end": "2026-11-10"}, "authorized_platforms": ["BBC iPlayer", "SBS On Demand"],
     "exceptions": [], "validation_state": "valid", "isan": "0000-0005-77D1-0000-D-0000-0000-2", "video": 3},
    {"title": "Kestrel", "type": "Short film", "owner": "Independent — R. Okafor", "territories": ["US", "NG"],
     "release_window": {"start": "2026-04-01", "end": "2026-10-01"}, "authorized_platforms": ["Vimeo On Demand"],
     "exceptions": [], "validation_state": "incomplete", "isan": None, "video": 4, "missing_fields": ["chain-of-title documents"]},
]

CANDIDATE_TITLES = [
    "FULL MOVIE 2026 HD no ads", "leaked scene compilation", "reaction: watching {a} for the first time", "{a} best moments (mirrored)",
    "{a} — episode dub compilation", "PART 3/7 {a}", "{a} 1.1x speed edit", "movie recap in 12 minutes: {a}", "{a} clip — fight scene",
    "camrip {a} 480p", "{a} full trailer breakdown", "{a} sped up + pitched", "night stream VOD (includes {a})", "{a} scene edit w/ music",
]

UPLOADERS = ["cine_dump_42", "movienights.hd", "clipfarm_official", "reactordave", "telegram:@filmvault", "user-9f21c", "nordic_streams", "kestrelfan01", "anon_uploader", "trailerbreakdowns"]

WORKERS = [
    {"id": "fp-worker-01", "role": "fingerprint", "status": "healthy", "load": 0.62, "version": "fp-3.4.1"},
    {"id": "fp-worker-02", "role": "fingerprint", "status": "healthy", "load": 0.41, "version": "fp-3.4.1"},
    {"id": "match-node-a", "role": "matcher", "status": "healthy", "load": 0.78, "version": "match-2.9.0"},
    {"id": "match-node-b", "role": "matcher", "status": "degraded", "load": 0.93, "version": "match-2.9.0"},
    {"id": "frame-ex-01", "role": "frame_extractor", "status": "healthy", "load": 0.35, "version": "fx-1.12.0"},
    {"id": "audio-al-01", "role": "audio_aligner", "status": "healthy", "load": 0.52, "version": "aa-1.6.2"},
    {"id": "ingest-gw", "role": "ingestion", "status": "healthy", "load": 0.22, "version": "ing-4.0.3"},
    {"id": "crawler-pool", "role": "crawler", "status": "offline", "load": 0.0, "version": "crawl-0.9.0 (future)"},
]

MODEL = {"name": "CineShield Transform-Robust Matcher", "version": "2.9.0", "fingerprint_version": "fp-3.4.1", "audio_model": "aa-1.6.2", "frame_model": "fx-1.12.0", "trained_on": "2026-04-18"}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def sev_from(priority):
    if priority >= 85:
        return "critical"
    if priority >= 65:
        return "high"
    if priority >= 40:
        return "medium"
    return "low"


def build_evidence(rng, seed_key, asset, asset_dur, cand_video, cand_dur, visual, audio, coverage, offset, available=True):
    seg_count = rng.randint(1, 4)
    segs = []
    total = coverage * asset_dur
    per = total / seg_count
    cursor = rng.uniform(5, max(6, asset_dur * 0.15))
    for i in range(seg_count):
        length = max(4, per * rng.uniform(0.7, 1.3))
        p_start = min(cursor, asset_dur - length - 1)
        c_start = clamp(p_start + offset, 0, max(0, cand_dur - length - 1))
        segs.append({
            "id": f"seg-{i + 1}",
            "protected_start": round(p_start, 1), "protected_end": round(p_start + length, 1),
            "candidate_start": round(c_start, 1), "candidate_end": round(c_start + length, 1),
            "offset": round(c_start - p_start, 1),
            "visual_score": round(clamp(visual + rng.uniform(-0.08, 0.06)), 2),
            "audio_score": round(clamp(audio + rng.uniform(-0.08, 0.06)), 2),
        })
        cursor = p_start + length + rng.uniform(10, max(12, asset_dur * 0.12))
    frames = []
    for s in segs:
        for k in range(2):
            t = round(s["protected_start"] + (s["protected_end"] - s["protected_start"]) * (0.25 + 0.5 * k), 1)
            frames.append({
                "t_protected": t, "t_candidate": round(t + s["offset"], 1), "segment_id": s["id"],
                "protected_url": f"https://picsum.photos/seed/{seed_key}-p{len(frames)}/320/180?grayscale",
                "candidate_url": f"https://picsum.photos/seed/{seed_key}-c{len(frames)}/320/180?grayscale",
                "similarity": round(clamp(visual + rng.uniform(-0.1, 0.05)), 2),
            })
    audio_align = []
    for i in range(40):
        base = 0.3 + 0.5 * abs(rng.gauss(0, 0.6))
        audio_align.append({"t": i, "protected": round(clamp(base), 2),
                            "candidate": round(clamp(base * audio + rng.uniform(-0.25, 0.25) * (1 - audio)), 2)})
    structural = clamp((visual + audio) / 2 + rng.uniform(-0.05, 0.1))
    temporal = clamp(visual - rng.uniform(0, 0.1))
    fp = clamp(visual * 0.9 + rng.uniform(0, 0.1))
    transforms = rng.sample(TRANSFORMS, rng.randint(1, 4))
    return {
        "protected_media_url": GCS + VIDEOS[asset["video"]][0],
        "protected_duration": asset_dur,
        "candidate_media_url": GCS + cand_video[0] if available else None,
        "candidate_duration": cand_dur,
        "candidate_available": available,
        "candidate_status": "available" if available else "fetch_failed",
        "matched_segments": segs,
        "frames": frames,
        "audio_alignment": audio_align,
        "scores": {
            "visual": {"value": round(visual, 2), "uncertainty": round(rng.uniform(0.03, 0.09), 2)},
            "audio": {"value": round(audio, 2), "uncertainty": round(rng.uniform(0.04, 0.12), 2)},
            "structural": {"value": round(structural, 2), "uncertainty": round(rng.uniform(0.03, 0.08), 2)},
            "temporal": {"value": round(temporal, 2), "uncertainty": round(rng.uniform(0.02, 0.07), 2)},
            "fingerprint": {"value": round(fp, 2), "uncertainty": round(rng.uniform(0.02, 0.06), 2)},
        },
        "transformations": transforms,
        "model": MODEL,
    }


def build_cases(rng):
    cases, candidates = [], []
    n = 0
    dup_group_specs = [(0, 3), (3, 2)]
    dup_map = {}
    for gi, (asset_idx, size) in enumerate(dup_group_specs):
        for j in range(size):
            dup_map[len(dup_map) + 30] = (f"DG-{101 + gi}", asset_idx, j == 0)
    total = 34
    base_time = datetime.now(timezone.utc)
    for i in range(total):
        n += 1
        case_id = f"CS-{9400 + n}"
        if i in dup_map:
            group_id, asset_idx, primary = dup_map[i]
        else:
            group_id, asset_idx, primary = None, rng.randrange(len(ASSETS)), True
        asset = ASSETS[asset_idx]
        asset_dur = VIDEOS[asset["video"]][1]
        cand_video = rng.choice([v for k, v in enumerate(VIDEOS) if k != asset["video"]])
        cand_dur = cand_video[1]
        platform = rng.choice(PLATFORMS)
        profile = rng.random()
        if profile < 0.18:
            visual, audio = rng.uniform(0.86, 0.97), rng.uniform(0.25, 0.48)
        elif profile < 0.3:
            visual, audio = rng.uniform(0.3, 0.5), rng.uniform(0.84, 0.95)
        elif profile < 0.7:
            visual, audio = rng.uniform(0.78, 0.98), rng.uniform(0.7, 0.96)
        else:
            visual, audio = rng.uniform(0.35, 0.7), rng.uniform(0.3, 0.7)
        if group_id:
            visual, audio = 0.93 + rng.uniform(-0.02, 0.02), 0.9 + rng.uniform(-0.03, 0.03)
        coverage = rng.uniform(0.08, 0.92)
        confidence = clamp(0.55 * visual + 0.3 * audio + 0.15 * coverage + rng.uniform(-0.04, 0.04))
        novelty = rng.uniform(0.05, 0.95)
        in_window = asset["release_window"]["start"] <= base_time.strftime("%Y-%m-%d") <= asset["release_window"]["end"]
        urgency = clamp(0.4 * (1 if in_window else 0.3) + 0.35 * min(1, rng.uniform(0, 1.2)) + 0.25 * coverage)
        priority = int(round(100 * clamp(0.45 * confidence + 0.2 * coverage + 0.2 * urgency + 0.15 * novelty)))
        processing = rng.choices(["complete", "complete", "complete", "complete", "processing", "failed", "partial"], k=1)[0]
        available = processing != "failed" and not (processing == "partial" and rng.random() < 0.5)
        offset = rng.uniform(-30, 30)
        evidence = build_evidence(rng, case_id.lower(), asset, asset_dur, cand_video, cand_dur, visual, audio, coverage, offset, available)
        conflicts = []
        if visual - audio > 0.3:
            conflicts.append({"type": "visual_vs_audio", "summary": "Strong visual match / weak audio match",
                              "detail": "Audio track may have been replaced or pitch-shifted. Confirm whether the visual sequence alone constitutes protected content."})
        if audio - visual > 0.3:
            conflicts.append({"type": "audio_vs_visual", "summary": "Strong audio match / weak visual match",
                              "detail": "Could be a reaction/commentary video reusing the soundtrack, or heavy visual transformation. Inspect frames before deciding."})
        if confidence > 0.8 and coverage < 0.2:
            conflicts.append({"type": "confidence_vs_coverage", "summary": "High confidence on a small slice of the asset",
                              "detail": "Only a short excerpt matched. Check asset exceptions (trailer / fair-use clip allowances) before acting."})
        codes = []
        codes.append("RC-VIS-HIGH" if visual >= 0.75 else "RC-VIS-LOW")
        codes.append("RC-AUD-HIGH" if audio >= 0.75 else "RC-AUD-LOW")
        if evidence["scores"]["temporal"]["value"] > 0.7:
            codes.append("RC-TEMP-ALIGN")
        codes.append("RC-COV-HIGH" if coverage > 0.7 else ("RC-COV-PARTIAL" if coverage < 0.4 else None))
        if asset["validation_state"] != "valid":
            codes.append("RC-RIGHTS-GAP")
        if group_id and not primary:
            codes.append("RC-DUP-NEAR")
        if novelty > 0.75:
            codes.append("RC-NOVEL-TRANSFORM")
        if platform in asset["authorized_platforms"]:
            codes.append("RC-PLATFORM-AUTH")
        if not available:
            codes.append("RC-MEDIA-UNAVAIL")
        if any("Speed" in t for t in evidence["transformations"]):
            codes.append("RC-SPEED")
        if in_window:
            codes.append("RC-RELEASE-WINDOW")
        codes = [c for c in codes if c]
        rights_status = "verified" if asset["validation_state"] == "valid" else "verification_needed"
        created = base_time - timedelta(hours=rng.uniform(1, 200))
        cand_id = f"CND-{5200 + n}"
        cand_title = rng.choice(CANDIDATE_TITLES).format(a=asset["title"].split(" —")[0])
        source_type = rng.choices(["manual_upload", "reference_url", "partner_feed", "crawler"], weights=[3, 4, 1, 1], k=1)[0]
        uploader = rng.choice(UPLOADERS)
        source = {
            "platform": platform, "url": f"https://{platform.lower().replace(' ', '')}.example/watch/{rng.randrange(10**8, 10**9)}",
            "uploader": uploader, "views": rng.randrange(400, 2_400_000), "published_at": (created - timedelta(hours=rng.uniform(2, 72))).isoformat(),
            "region_detected": rng.choice(["US", "DE", "BR", "IN", "RU", "UK", "ID", "TR", "unknown"]), "source_type": source_type,
        }
        candidates.append({
            "id": cand_id, "title": cand_title, "source_type": source_type, "url": source["url"], "platform": platform,
            "ingestion_status": "complete" if processing == "complete" else processing, "submitted_by": "system" if source_type in ("partner_feed", "crawler") else "reviewer@cineshield.io",
            "case_id": case_id, "created_at": created.isoformat(), "media_url": evidence["candidate_media_url"], "duration": cand_dur,
        })
        status = "new" if rng.random() < 0.7 else rng.choice(["in_review", "monitoring", "pending_approval", "needs_evidence"])
        if processing == "failed":
            status = "needs_evidence" if rng.random() < 0.5 else "new"
        if group_id and not primary:
            status = "new"
        cases.append({
            "id": case_id, "asset_id": f"AST-{1000 + asset_idx}", "asset_title": asset["title"], "asset_owner": asset["owner"],
            "candidate_id": cand_id, "candidate_title": cand_title,
            "priority": priority, "confidence": round(confidence, 2), "coverage": round(coverage, 2), "severity": sev_from(priority),
            "novelty": round(novelty, 2), "urgency": round(urgency, 2), "source": platform, "source_type": source_type,
            "processing_status": processing, "processing_error": ("Candidate fetch failed: HTTP 403 from origin CDN" if processing == "failed" else ("Audio alignment job timed out (retry available)" if processing == "partial" else None)),
            "status": status, "rights_status": rights_status, "rights_missing": asset.get("missing_fields", []),
            "duplicate_group_id": group_id, "is_group_primary": primary, "duplicate_of": (f"CS-{9400 + [k for k, v in dup_map.items() if v[0] == group_id and v[2]][0] + 1}" if group_id and not primary else None),
            "conflicting_signals": conflicts, "reason_codes": codes, "evidence": evidence, "source_details": source,
            "in_release_window": in_window, "asset_authorized_platforms": asset["authorized_platforms"], "asset_exceptions": asset["exceptions"],
            "asset_territories": asset["territories"], "asset_release_window": asset["release_window"],
            "decision_count": 0, "enforcement_requested": None, "enforcement_status": None, "assigned_to": None,
            "created_at": created.isoformat(), "updated_at": created.isoformat(),
        })
    return cases, candidates


def build_jobs(rng, cases, assets):
    jobs = []
    for a in assets:
        jobs.append({"id": f"JOB-FP-{a['id']}", "type": "fingerprint", "target_id": a["id"], "target_label": a["title"],
                     "status": "complete" if a["fingerprint_status"] == "ready" else "processing", "progress": a["fingerprint_progress"],
                     "error": None, "model_version": MODEL["fingerprint_version"], "worker": "fp-worker-01",
                     "started_at": (datetime.now(timezone.utc) - timedelta(days=rng.randint(2, 30))).isoformat(), "updated_at": now_iso()})
    for c in cases:
        st = c["processing_status"]
        jobs.append({"id": f"JOB-MT-{c['id']}", "type": "match", "target_id": c["id"], "target_label": c["candidate_title"],
                     "status": {"complete": "complete", "processing": "processing", "failed": "failed", "partial": "partial"}[st],
                     "progress": {"complete": 100, "processing": rng.randint(20, 85), "failed": rng.randint(5, 60), "partial": 100}[st],
                     "error": c["processing_error"], "model_version": MODEL["version"], "worker": rng.choice(["match-node-a", "match-node-b"]),
                     "started_at": c["created_at"], "updated_at": c["updated_at"]})
    return jobs


def build_audit(rng, cases):
    events = []
    for c in cases[:20]:
        events.append({"id": f"AE-{c['id']}-ingest", "type": "case_created", "case_id": c["id"], "actor": "system", "actor_email": None, "role": "system",
                       "detail": f"Case created from {c['source_type'].replace('_', ' ')} candidate {c['candidate_id']} — matcher {MODEL['version']}, fingerprint {MODEL['fingerprint_version']}",
                       "severity": "info", "created_at": c["created_at"]})
    events.append({"id": "AE-seed-denied", "type": "access_denied", "case_id": cases[2]["id"], "actor": "Priya Raman", "actor_email": "reviewer@cineshield.io", "role": "reviewer",
                   "detail": "Attempted 'approve_enforcement' without required permission", "severity": "warning",
                   "created_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()})
    events.append({"id": "AE-seed-fail", "type": "job_failed", "case_id": None, "actor": "system", "actor_email": None, "role": "system",
                   "detail": "match-node-b: Candidate fetch failed: HTTP 403 from origin CDN", "severity": "error",
                   "created_at": (datetime.now(timezone.utc) - timedelta(hours=9)).isoformat()})
    events.append({"id": "AE-seed-model", "type": "model_deployed", "case_id": None, "actor": "Admin", "actor_email": None, "role": "admin",
                   "detail": "Matcher 2.9.0 promoted to production; fingerprint fp-3.4.1 unchanged", "severity": "info",
                   "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()})
    return events


async def seed_users(db):
    users = [
        ("lgoyal2006@gmail.com", os.environ.get("ADMIN_PASSWORD", "Admin#2026"), "Lakshya Goyal", "admin"),
        ("reviewer@cineshield.io", os.environ.get("REVIEWER_PASSWORD", "Reviewer#2026"), "Priya Raman", "reviewer"),
        ("approver@cineshield.io", os.environ.get("APPROVER_PASSWORD", "Approver#2026"), "Daniel Mbeki", "approver"),
    ]
    for i, (email, pw, name, role) in enumerate(users):
        existing = await db.users.find_one({"email": email})
        if not existing:
            await db.users.insert_one({"id": f"USR-{100 + i}", "email": email, "password_hash": hash_password(pw), "name": name, "role": role, "created_at": now_iso()})
        elif not verify_password(pw, existing["password_hash"]):
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})


async def seed_data(db):
    if await db.cases.count_documents({}) > 0:
        return
    rng = random.Random(2026)
    assets = []
    for i, a in enumerate(ASSETS):
        assets.append({
            "id": f"AST-{1000 + i}", "title": a["title"], "type": a["type"], "owner": a["owner"], "territories": a["territories"],
            "release_window": a["release_window"], "authorized_platforms": a["authorized_platforms"], "exceptions": a["exceptions"],
            "validation_state": a["validation_state"], "missing_fields": a.get("missing_fields", []), "isan": a["isan"],
            "media_url": GCS + VIDEOS[a["video"]][0], "duration": VIDEOS[a["video"]][1],
            "fingerprint_status": "ready", "fingerprint_progress": 100, "fingerprint_version": MODEL["fingerprint_version"],
            "reference_type": "upload", "created_at": (datetime.now(timezone.utc) - timedelta(days=rng.randint(5, 60))).isoformat(),
        })
    cases, candidates = build_cases(rng)
    await db.assets.insert_many(assets)
    await db.cases.insert_many(cases)
    await db.candidates.insert_many(candidates)
    await db.jobs.insert_many(build_jobs(rng, cases, assets))
    await db.audit_events.insert_many(build_audit(rng, cases))
