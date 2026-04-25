import os
import sys
import uvicorn
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# Add backend directory to sys.path so backend modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from backend.main import app

frontend_dir = os.path.join(os.path.dirname(__file__), "Frontend")

# Serve the Frontend CSS and JS statically
app.mount("/CSS", StaticFiles(directory=os.path.join(frontend_dir, "CSS")), name="css")
app.mount("/JS", StaticFiles(directory=os.path.join(frontend_dir, "JS")), name="js")
app.mount("/HTML", StaticFiles(directory=os.path.join(frontend_dir, "HTML")), name="html")

# Define known routes
KNOWN_ROUTES = {
    "/home": "home.html",
    "/account": "account.html",
    "/company": "company.html",
    "/policy": "policy.html",
    "/fraud-fairness": "fraudness.html",
    "/login": "login.html",
    "/register": "register.html",
    "/register-org": "register-org.html",
    "/register-user": "register-user.html",
    "/user-pending": "user-pending.html",
    "/org-created": "org-created.html"
}

@app.get("/{full_path:path}")
async def catch_all(request: Request, full_path: str):
    # Don't intercept API routes
    if full_path.startswith("api/"):
        raise StarletteHTTPException(status_code=404, detail="Not Found")
        
    path_with_slash = f"/{full_path}"
    if not full_path or path_with_slash == "/":
        return FileResponse(os.path.join(frontend_dir, "HTML", "home.html"))
        
    if path_with_slash in KNOWN_ROUTES:
        return FileResponse(os.path.join(frontend_dir, "HTML", KNOWN_ROUTES[path_with_slash]))
        
    # If the user directly accesses an HTML file
    direct_html = os.path.join(frontend_dir, "HTML", f"{full_path}.html")
    if os.path.exists(direct_html):
        return FileResponse(direct_html)
        
    return FileResponse(os.path.join(frontend_dir, "HTML", "home.html"))

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    print(f"Starting PolicyGuard FastAPI Server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)