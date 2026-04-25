from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.chat import router as chat_router
from api.routes.upload import router as upload_router
from api.routes.auth import router as auth_router
from api.routes.policy import router as policy_router

app = FastAPI(title="PolicyGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(policy_router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok"}
