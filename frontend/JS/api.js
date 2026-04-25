const API_BASE = "http://localhost:8000/api";

// ── Token helpers ─────────────────────────────────────────────────────────────

function getToken() {
    return localStorage.getItem("CCM_token") || "";
}

function saveToken(token) {
    localStorage.setItem("CCM_token", token);
}

function clearToken() {
    localStorage.removeItem("CCM_token");
}

function authHeaders() {
    return { "Authorization": `Bearer ${getToken()}` };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function apiLogin(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");
    saveToken(data.token);
    return data; // { token, role, company_id }
}

async function apiRegisterOrg(email, username, password, company_name) {
    const res = await fetch(`${API_BASE}/auth/register/org`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, company_name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Registration failed");
    saveToken(data.token);
    return data;
}

async function apiRegisterUser(email, username, password, company_name) {
    const res = await fetch(`${API_BASE}/auth/register/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, company_name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Registration failed");
    saveToken(data.token);
    return data;
}

// ── Policy chat ───────────────────────────────────────────────────────────────

async function apiChat(query) {
    const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Chat failed");
    // { verdict, reasoning, citations, confidence, domains_checked }
    return data;
}

// ── Policy upload (admin / org only) ─────────────────────────────────────────

async function apiUploadPolicy(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/upload-policy`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    return data; // { message, doc_id }
}

// ── List policies ─────────────────────────────────────────────────────────────

async function apiListPolicies() {
    const res = await fetch(`${API_BASE}/policies`, {
        headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load policies");
    return data; // [{ _id, title, filename, uploaded_at }]
}

// ── User approval (admin only) ────────────────────────────────────────────────

async function apiGetPendingUsers() {
    const res = await fetch(`${API_BASE}/pending-users`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load pending users");
    return data;
}

async function apiApproveUser(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}/approve`, {
        method: "POST",
        headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Approve failed");
    return data;
}

async function apiDenyUser(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}/deny`, {
        method: "POST",
        headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Deny failed");
    return data;
}

// ── Delete policy ─────────────────────────────────────────────────────────────

async function apiDeletePolicy(docId) {
    const res = await fetch(`${API_BASE}/policies/${docId}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Delete failed");
    return data;
}
