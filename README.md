# CineShield 2.0

CineShield 2.0 is an academic prototype for AI-assisted copyright threat intelligence. It focuses on detecting transformed copies of video content and presenting evidence to a human reviewer instead of making automatic legal or enforcement decisions.

The project is inspired by a real-world problem: unauthorized video copies are often cropped, compressed, screen-recorded, watermarked, sped up, subtitled, overlaid, or audio-modified. Simple file hashes and filename search are not enough for these cases.

## Research Focus

The recommended final-year project scope is:

> Can adaptive multimodal fusion improve the detection of transformed video copies compared with individual visual, audio, and temporal matching techniques?

This keeps the project focused on a measurable technical contribution rather than trying to build a complete copyright enforcement platform.

The intended research contribution is to compare single-modality matching against a fused approach that combines:

- Visual similarity evidence
- Audio fingerprint or alignment evidence
- Temporal and scene-sequence alignment
- Coverage estimation
- Confidence and uncertainty indicators
- Human-review-ready evidence packaging

## Current Prototype

This repository currently contains a working review-console prototype:

- React frontend for reviewers, approvers, and admins
- FastAPI backend with authentication and role-based review actions
- MongoDB persistence
- Seeded demo data for protected assets, candidate videos, cases, jobs, and audit events
- Evidence-style case pages with scores, matched segments, transformations, reason codes, and review decisions
- Human authorization boundary before enforcement-style decisions

Important: the current code uses seeded synthetic/demo case data. It does not yet implement the full production media-processing pipeline with FFmpeg, OpenCV, audio fingerprinting, vector search, or trained fusion models. Those are part of the research and implementation roadmap.

## Features

- Protected asset registry
- Candidate intake workflow
- Prioritized review queue
- Case detail view with evidence summaries
- Decision recording with rationale
- Role-based access:
  - Reviewer
  - Approver
  - Admin
- Processing jobs view
- Audit log
- Demo users seeded at backend startup

## Tech Stack

Frontend:

- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React icons
- Recharts

Backend:

- FastAPI
- Uvicorn
- MongoDB
- Motor async MongoDB driver
- bcrypt password hashing
- PyJWT authentication

Database:

- MongoDB on `localhost:27017`

## Repository Structure

```text
Cineshield/
  backend/
    auth.py          # Password hashing, JWT auth, roles, cookies
    seed.py          # Demo users, assets, cases, jobs, audit data
    server.py        # FastAPI app and API routes
  frontend/
    src/
      components/    # Shared UI and app shell
      context/       # Auth context
      lib/           # API client and helpers
      pages/         # Login, queue, assets, candidates, jobs, audit, case detail
    package.json
    vite.config.js
  auth_testing.md
  design_guidelines.json
```

## Prerequisites

Install these before running the project:

- Node.js
- npm
- Python 3.10 or newer
- MongoDB running locally on port `27017`

On Windows PowerShell, if `npm` is blocked by script execution policy, use `npm.cmd` instead.

## Backend Setup

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install fastapi uvicorn python-dotenv motor bcrypt PyJWT
```

Start MongoDB if it is not already running.

Then start the backend:

```powershell
cd backend
$env:DB_NAME = "cineshield_dev"
$env:MONGO_URL = "mongodb://localhost:27017"
..\.venv\Scripts\python.exe server.py
```

The API runs at:

```text
http://127.0.0.1:8001
```

Health check:

```text
http://127.0.0.1:8001/api/status
```

## Frontend Setup

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

If PowerShell blocks `npm`, use:

```powershell
npm.cmd install
npm.cmd run dev
```

The frontend runs at:

```text
http://127.0.0.1:5173
```

The Vite dev server proxies `/api` requests to the backend at `http://localhost:8001`.

## Demo Accounts

These accounts are seeded automatically by the backend:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `lgoyal2006@gmail.com` | `Admin#2026` |
| Reviewer | `reviewer@cineshield.io` | `Reviewer#2026` |
| Approver | `approver@cineshield.io` | `Approver#2026` |

These credentials are for local demo/testing only.

## Main API Routes

Authentication:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Cases:

- `GET /api/cases`
- `GET /api/cases/{case_id}`
- `POST /api/cases/{case_id}/decision`

Assets:

- `GET /api/assets`
- `POST /api/assets/register`

Candidates:

- `GET /api/candidates`
- `POST /api/candidates/intake`

Operations:

- `GET /api/jobs`
- `GET /api/audit`
- `GET /api/workers`
- `GET /api/status`

## Evaluation Plan

For the final project and research paper, evaluation should be based on a controlled dataset with ground truth.

Dataset should include:

- Original protected videos
- Exact copies
- Transcoded copies
- Cropped copies
- Screen-recorded copies
- Speed-modified copies
- Watermarked videos
- Subtitle or overlay videos
- Audio-modified videos
- Similar but unrelated negative videos
- Hard negatives from similar scenes, genres, actors, trailers, or soundtrack styles

Recommended metrics:

- Precision
- Recall
- F1-score
- Top-k recall
- ROC-AUC or PR-AUC
- Coverage error
- Confidence calibration
- Processing latency
- Throughput
- CPU, GPU, memory, and storage cost per video minute

The key comparison should be:

- Visual-only matching
- Audio-only matching
- Temporal or scene-only matching
- Fixed weighted fusion
- Adaptive multimodal fusion

The final analysis should demonstrate the trade-off between detection accuracy, processing time, and computational cost.

## Proposed Research Pipeline

The complete research version can be implemented in phases:

1. Prepare benchmark dataset with originals, transformed positives, and hard negatives.
2. Extract visual features using perceptual hashes, frame embeddings, or CNN/CLIP-style features.
3. Extract audio features using fingerprints, spectrogram peaks, MFCC/chroma features, or alignment methods.
4. Estimate temporal similarity using scene boundaries, segment alignment, or dynamic time warping.
5. Build baseline single-modality matchers.
6. Build a fusion model that adapts weights based on transformation type, confidence, coverage, and signal quality.
7. Compare baselines and fusion on held-out test data.
8. Report accuracy, latency, throughput, and cost.
9. Present evidence packages through the review console.

## Safety Boundary

CineShield should not directly declare legal infringement. It should produce:

- Match evidence
- Confidence scores
- Coverage estimates
- Reason codes
- Uncertainty flags
- Reviewer decision history
- Audit logs

Any external response, such as takedown reporting or legal escalation, should require authorized human review.

## Limitations

- The current repository is a prototype dashboard and API, not a complete media matching engine.
- Seeded data is useful for UI and workflow testing but is not valid research evidence.
- Real evaluation requires a controlled dataset with known ground truth.
- Very short clips may not contain enough unique evidence for high confidence.
- Heavy overlays, dubbing, reaction layouts, extreme crop, blur, or screen recording can reduce matching reliability.
- A technical match does not automatically prove unauthorized use.

## Final Expected Outcome

The strongest final-year version of CineShield should be a focused research-backed system that proves whether adaptive multimodal fusion improves transformed-video copy detection over individual visual, audio, and temporal matching methods, while keeping human review and auditability at the center of workflow.
