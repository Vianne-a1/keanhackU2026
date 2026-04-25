# CCM AI

CCM AI is an AI-powered compliance assistant that helps employees check requests against company policies and flags risky vendor contracts before signing.

**Team Members:** Tiffany Yang, Xinying Cai, Yue Yao

**Built with:** FastAPI, React, OpenRouter (LLM), MongoDB, Gemini, Claude, and GPT

**APIs/AIs used:** OpenRouter API — `nvidia/nemotron-3-super-120b-a12b:free` (default)

## Features

- **Policy Chat** — Ask natural-language questions ("Can I expense this?", "Do I need approval to share this data?") and get a structured verdict with citations from your company's uploaded policies.
- **Contract Analysis** — Upload a vendor contract (PDF or DOCX) and get an AI risk assessment: fraud signals, unfair clauses, and an overall verdict.
- **Multi-tenant** — Each company has its own policies. Employees register under an organization and only see that org's policies.
- **Role-based access** — Admins upload and manage policies; regular users query them.

## Architecture

```
keanuhackthis/
├── backend/          # FastAPI + Python
│   ├── agents/       # LLM agent pipeline
│   │   ├── query_understanding.py   # Parses employee intent
│   │   ├── policy_retrieval.py      # Fetches relevant policy chunks
│   │   ├── policy_reasoning.py      # Issues verdict + citations
│   │   ├── contract_analysis.py     # Vendor contract risk analysis
│   │   └── pipeline.py              # Chains agents together
│   ├── api/routes/   # REST endpoints (auth, chat, upload, policy)
│   ├── core/         # Config, JWT auth, base agent, pipeline state
│   ├── db/           # MongoDB connection
│   ├── services/     # PDF/DOCX parser
│   └── main.py       # FastAPI app entry point
└── frontend/         # React + Vite + Tailwind
    └── src/
        ├── pages/    # ChatPage, UploadPage, AdminPage
        └── components/
            ├── chat/     # ChatWindow, MessageBubble
            ├── upload/   # ContractUpload, PolicyUpload
            └── dashboard/ # VerdictCard
```

The policy chat pipeline runs three agents in sequence:
1. `QueryUnderstandingAgent` — extracts intent and keywords
2. `PolicyRetrievalAgent` — retrieves matching policy chunks from MongoDB
3. `PolicyReasoningAgent` — produces a JSON verdict with reasoning and citations

Contract analysis runs a single `ContractAnalysisAgent` that looks for fraud signals and unfair clauses and returns a risk verdict.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, Uvicorn |
| LLM | OpenRouter API (default: `nvidia/nemotron-3-super-120b-a12b:free`) |
| Database | MongoDB Atlas |
| Auth | JWT (PyJWT + passlib/bcrypt) |
| Doc parsing | pypdf, python-docx |
| Frontend | React 18, Vite, Tailwind CSS |

## Usage Guide

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB Atlas cluster (or local MongoDB)
- [OpenRouter](https://openrouter.ai) API key

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your keys (see Environment Variables below)

python3 -m uvicorn main:app --reload --port 8000
```



### Frontend

```bash
cd frontend
python3 -m http.server 3000
```

The app runs at `http://localhost:3000`.

### Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```env
OPENROUTER_API_KEY=your_key_here
LLM_MODEL=nvidia/nemotron-3-super-120b-a12b:free
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/policyguard
JWT_SECRET=your-random-secret-string
```

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | API key from [openrouter.ai](https://openrouter.ai) |
| `LLM_MODEL` | Any OpenRouter model ID. Defaults to a free Nemotron model. |
| `MONGO_URI` | [MongoDB](https://www.mongodb.com/) connection string | 
| `JWT_SECRET` | Secret for signing JWT tokens — use a long random string in production |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | Create a new user account |
| POST | `/api/login` | Authenticate and receive a JWT |
| POST | `/api/chat` | Ask a policy question |
| POST | `/api/upload-contract` | Upload a vendor contract for risk analysis |
| POST | `/api/upload-policy` | Upload a company policy document (admin) |
| GET | `/api/policies` | List uploaded policies |

## Verdict Types

### Policy Chat

| Verdict | Meaning |
|---------|---------|
| `approved` | Clearly allowed — no further action needed |
| `needs_approval` | Allowed but requires manager sign-off |
| `conditional` | Allowed only if specific conditions are met |
| `escalate` | Must go to Legal, HR, or executive review |
| `prohibited` | Explicitly not allowed |
| `red_flag` | Serious compliance or fraud risk |
| `out_of_scope` | Not a policy matter or no relevant policy found |

### Contract Analysis

| Verdict | Meaning |
|---------|---------|
| `approved` | No significant issues found |
| `needs_approval` | Some clauses warrant review before signing |
| `red_flag` | Fraud signals or predatory clauses detected |
