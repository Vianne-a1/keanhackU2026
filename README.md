# PolicyGuard Agent Backend — Feature 2

Feature 2 implements the vendor contract upload and fraud/fairness audit API.

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

## Main endpoints

- `POST /api/contracts/upload` — upload a PDF, DOCX, or TXT contract.
- `POST /api/contracts/audit?contract_id=...&user_id=demo-user` — audit a previously uploaded contract.
- `POST /api/contracts/audit-text` — audit pasted contract text directly.
- `GET /api/audits/user/{user_id}` — list previous audit results.

## Environment

Set `MONGODB_URI` for deployment. If omitted, the default shared test URI in `database.py` is used.
