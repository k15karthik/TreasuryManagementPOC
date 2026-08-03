# Treasury Management Copilot

An AI-assisted advisor that helps Treasury Management Consultants (TMCs) analyze a business client
and recommend the most appropriate Treasury Management products. It does not replace the TMC's
judgment — it augments the discovery conversation with a fast, structured, explainable first pass
that a consultant reviews, edits, and presents.

This is a proof of concept intended to be demonstrated to bank executives: a modern banking
dashboard UI, a transparent multi-agent AI workflow you can watch reason in real time, and an
executive-quality recommendation report at the end.

---

## How it works

A client's intake data is passed through a 5-agent [LangGraph](https://github.com/langchain-ai/langgraph)
workflow. Each agent has one job and returns a strictly-typed Pydantic object — no free-form
paragraphs are ever passed between agents.

```
Client Intake
      │
      ▼
┌─────────────────────┐   Analyzes industry, size, growth stage,
│ Client Profile Agent │   operational complexity, risk factors
└─────────────────────┘
      │
      ▼
┌─────────────────────┐   Identifies concrete treasury needs
│ Needs Assessment     │   (fraud risk, liquidity, manual payments,
│ Agent                │   slow collections, multi-location, etc.)
└─────────────────────┘
      │
      ▼
┌─────────────────────┐   Retrieves candidate products from the
│ Product              │   ChromaDB knowledge base via semantic
│ Recommendation Agent │   search, then reasons over confidence,
│                      │   ROI, and benefits per client need
└─────────────────────┘
      │
      ▼
┌─────────────────────┐   Reviews for duplicates, business fit,
│ Compliance Agent     │   conflicts, missing products, and
└─────────────────────┘   low-confidence recommendations
      │
      ▼
┌─────────────────────┐   Synthesizes everything into a polished,
│ Executive Summary    │   client-ready report with implementation
│ Agent                │   priority, risks, ROI, and next steps
└─────────────────────┘
      │
      ▼
Executive Report
```

The frontend streams this pipeline live over Server-Sent Events, so a TMC can watch each agent
move from "Thinking..." to "Complete" with its structured output surfaced immediately — not just a
loading spinner.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | FastAPI, Python 3.12, async throughout |
| AI Orchestration | LangGraph, LangChain, OpenAI GPT (via `langchain-openai`) |
| Structured Output | Pydantic v2 (`with_structured_output` on every agent) |
| Relational Storage | SQLite (via SQLAlchemy) — persists every completed analysis |
| Vector Storage | ChromaDB — semantic search over the treasury product knowledge base |

---

## Project Structure

```
TMCS Copilot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, startup (DB init + KB seed)
│   │   ├── config.py            # Settings (env vars, paths)
│   │   ├── api/                 # Route handlers (analysis, knowledge, health)
│   │   ├── models/               # Pydantic + SQLAlchemy models
│   │   ├── agents/               # One file per LangGraph agent
│   │   ├── graph/                # LangGraph StateGraph wiring + shared state
│   │   ├── knowledge/            # products.json + Chroma loader/vector store
│   │   ├── database/             # SQLite session + init
│   │   └── services/             # Orchestrates a run, streams SSE, persists results
│   ├── examples/sample_clients.json
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/                      # Next.js App Router pages
│   ├── components/
│   │   ├── layout/                # Sidebar, TopBar
│   │   ├── intake/                 # Client intake form
│   │   ├── workflow/               # Live agent visualization
│   │   ├── report/                 # Executive report + gauges/meters
│   │   ├── knowledge/              # Product catalog cards
│   │   └── ui/                     # shadcn/ui primitives
│   ├── lib/                       # API client, types, form options, sample data
│   └── package.json
│
└── README.md
```

---

## Installation

### Prerequisites

- Python 3.12 (Chroma's dependencies do not yet support 3.14 — if `python3 --version` shows
  something newer, install 3.12 via `brew install python@3.12`)
- Node.js 20+
- An OpenAI API key with available quota

### Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and set OPENAI_API_KEY to your real key

uvicorn app.main:app --reload --port 8000
```

On startup, ChromaDB is seeded from `app/knowledge/products.json` if it isn't already (idempotent —
safe to restart repeatedly). SQLite tables are created automatically at
`backend/data/tmcs_copilot.db`. If the OpenAI key is missing or has no quota, seeding logs a
warning but the server still starts (see "Resilient startup" below).

Verify it's running: `curl localhost:8000/api/health` → `{"status":"ok"}`.

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # defaults to http://localhost:8000, adjust if needed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend must be running for any page to
show real data.

---

## Using the app

1. **Client Input** — fill out the intake form, or click one of the four **Load Example** buttons
   to instantly populate a realistic sample client (a cash-heavy restaurant group, a manufacturer
   with a fraud history, a fast-growing SaaS company, or a multi-location healthcare provider).
2. Submit. You're taken to a live view of the 5-agent workflow — each agent card animates through
   **Thinking... → Complete**, with a running reasoning timeline alongside it.
3. Once the Executive Summary Agent finishes, the full report renders in place: client overview,
   business needs, ranked product recommendations (with confidence gauges, reasoning, benefits, and
   estimated ROI), business benefits, implementation priority, potential risks, estimated business
   impact, products considered but **not** recommended (and why), cross-sell opportunities, and a
   suggested next-meeting agenda.
4. The analysis is persisted automatically — find it later under **Past Analyses**.
5. **Knowledge Base** shows the full ONB Treasury Management product catalog that the Product
   Recommendation Agent searches against.

---

## Example client profiles

`backend/examples/sample_clients.json` (mirrored in the frontend at `frontend/lib/sample-clients.ts`
for one-click loading) includes four profiles spanning distinct treasury needs:

- **Harborline Restaurant Group** — cash-heavy, 12 locations, no centralized cash visibility
- **Northgate Manufacturing Co.** — significant check fraud loss, idle cash, heavy AP volume
- **Pinnacle Cloud Software** — fast-growing SaaS, manual payroll and collections, expanding internationally
- **Meridian Health Partners** — multi-clinic healthcare, slow reimbursement deposits, payroll complexity

---

## Knowledge base

`backend/app/knowledge/products.json` contains 13 ONB Treasury Management products, each with:

```json
{
  "id": "positive-pay",
  "name": "Positive Pay",
  "category": "Fraud Prevention",
  "description": "...",
  "ideal_client": "...",
  "benefits": ["..."],
  "requirements": ["..."],
  "pain_points_solved": ["High Fraud Risk", "..."],
  "keywords": ["fraud", "check fraud", "..."]
}
```

Products: Positive Pay, ACH Origination, Lockbox, Remote Deposit Capture, Cash Vault, Zero Balance
Accounts, Sweep Accounts, Merchant Services, Wire Transfers, Controlled Disbursement, Business Bill
Pay, Information Reporting, Commercial Card Program.

At startup, each product is embedded (OpenAI `text-embedding-3-small`) and stored in a persistent
ChromaDB collection (`backend/data/chroma/`). The Product Recommendation Agent runs a semantic
search per identified client need to retrieve candidates before reasoning over them with the LLM.

---

## API reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/knowledge/products` | List all products in the knowledge base |
| GET | `/api/knowledge/products/{id}` | Get a single product |
| POST | `/api/analyses` | Run the 5-agent workflow for a `ClientProfile`; streams progress as Server-Sent Events, persists the result, and emits a final `done` event with the full report |
| GET | `/api/analyses` | List all past analyses (id, company, industry, timestamp) |
| GET | `/api/analyses/{id}` | Fetch one full persisted analysis |

### SSE event shape (`POST /api/analyses`)

```jsonc
// Emitted twice per agent — once entering, once with output
{ "type": "agent_update", "agent": "profile", "label": "Client Profile Agent", "status": "thinking" }
{ "type": "agent_update", "agent": "profile", "label": "Client Profile Agent", "status": "complete", "output": { ... } }

// ...repeated for needs, product, compliance, executive...

// Final event once the run is persisted
{ "type": "done", "analysis_id": "...", "client": {...}, "executive_summary": {...}, ... }

// On failure
{ "type": "error", "message": "..." }
```

---

## Design notes

- **Structured everywhere.** Every agent uses `ChatOpenAI(...).with_structured_output(PydanticModel)`
  — the graph state (`app/graph/state.py`) is a typed dict of Pydantic models, never raw strings.
- **Resilient startup.** If the OpenAI key is missing/invalid or quota is exhausted, the API still
  boots and serves the knowledge base and UI; only `/api/analyses` (which needs the LLM) will fail
  until the key/quota issue is resolved.
- **This is decision support, not a decision-maker.** The UI and report footer are explicit that
  recommendations require TMC review before being presented to a client — consistent with the
  augment-not-replace goal of the tool.

### Troubleshooting

- **"Disallowed CORS origin" / requests failing silently from the browser** — the backend's
  `CORS_ORIGINS` in `.env` must exactly match the origin shown in your browser's address bar.
  It defaults to allowing both `http://localhost:3000` and `http://127.0.0.1:3000`; if you access
  the app via a different host/port, add it to `CORS_ORIGINS` (comma-separated) and restart the
  backend.

### Known non-blocking advisory

`npm audit` flags `sharp` (Next.js's optional, unused image-optimization dependency — this app
does not use `next/image` remote optimization) for a `libvips` CVE. `npm audit fix --force` would
downgrade Next.js to v9, which is not a real fix; this is left as-is since it's not on this app's
attack surface for a local demo.
