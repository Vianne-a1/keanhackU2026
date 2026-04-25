const ROUTE_KEYS = {
	orgs: "CCM_orgs",
	requests: "CCM_requests",
	documents: "CCM_documents",
	chatLogs: "CCM_chat_logs",
	activeOrg: "CCM_active_org",
	pendingRequest: "CCM_pending_request",
	sessionUser: "CCM_session_user",
	accountProfile: "CCM_account_profile"
};

function readStore(key) {
	try {
		return JSON.parse(localStorage.getItem(key) || "[]");
	} catch {
		return [];
	}
}

function writeStore(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}

function getOrganizations() {
	return readStore(ROUTE_KEYS.orgs);
}

function getSessionUser() {
	try {
		return JSON.parse(localStorage.getItem(ROUTE_KEYS.sessionUser) || "null");
	} catch {
		return null;
	}
}

function saveSessionUser(user) {
	localStorage.setItem(ROUTE_KEYS.sessionUser, JSON.stringify(user));
}

function getAccountProfile() {
	try {
        const session = getSessionUser();
        if (!session || !session.email) return null;
		const profiles = JSON.parse(localStorage.getItem(ROUTE_KEYS.accountProfile) || "{}");
        return profiles[session.email.toLowerCase()] || null;
	} catch {
		return null;
	}
}

function saveAccountProfile(profile) {
    const session = getSessionUser();
    if (!session || !session.email) return;
    const profiles = JSON.parse(localStorage.getItem(ROUTE_KEYS.accountProfile) || "{}");
    profiles[session.email.toLowerCase()] = profile;
	localStorage.setItem(ROUTE_KEYS.accountProfile, JSON.stringify(profiles));
	const matchedOrg = findOrg(profile.organization);
	if (matchedOrg) {
		localStorage.setItem(ROUTE_KEYS.activeOrg, JSON.stringify(matchedOrg));
	}
}

function getStoredDocuments() {
	return readStore(ROUTE_KEYS.documents);
}

function saveStoredDocuments(documents) {
	writeStore(ROUTE_KEYS.documents, documents);
}

function getStoredChatLogs() {
	return readStore(ROUTE_KEYS.chatLogs);
}

function clearSessionUser() {
	localStorage.removeItem(ROUTE_KEYS.sessionUser);
}

function getCurrentSessionEmail() {
	const sessionUser = getSessionUser();
	return sessionUser?.email || "";
}

function isOrgAdmin(org) {
	if (!org) {
		return false;
	}

	const sessionEmail = getCurrentSessionEmail().toLowerCase();
	const accountProfile = getAccountProfile();
	const roleText = String(accountProfile?.title || accountProfile?.role || "").toLowerCase();
	return sessionEmail && (sessionEmail === String(org.adminEmail || "").toLowerCase() || roleText.includes("admin"));
}

function getVisibleNavLinks() {
	const loggedIn = Boolean(getSessionUser());
	if (loggedIn) {
		return [
			{ href: "/HTML/home.html", label: "Home" },
			{ href: "/HTML/account.html", label: "Account" },
			{ href: "/HTML/company.html", label: "Company" },
			{ href: "/HTML/policy.html", label: "Policy" },
			{ href: "/HTML/fraudness.html", label: "Fraud/Fairness" },
			{ href: "/HTML/home.html?logout=1", label: "Logout", action: true }
		];
	}

	return [
		{ href: "/HTML/home.html", label: "Home" },
		{ href: "/HTML/policy.html", label: "Policy" },
		{ href: "/HTML/fraudness.html", label: "Fraud/Fairness" },
		{ href: "/HTML/login.html", label: "Login" },
		{ href: "/HTML/register.html", label: "Register" }
	];
}

function initDynamicNav() {
	const navs = document.querySelectorAll(".site-nav");
	if (!navs.length) {
		return;
	}

	const links = getVisibleNavLinks();
	navs.forEach((nav) => {
		nav.innerHTML = links
			.map((link) => {
				const className = link.action ? "data-nav-logout" : "";
				return `<a href="${link.href}" ${className ? `class="${className}"` : ""}>${link.label}</a>`;
			})
			.join("");
	});

	const logoutLink = document.querySelector("[data-nav-logout]");
	if (logoutLink) {
		logoutLink.addEventListener("click", (event) => {
			event.preventDefault();
			clearSessionUser();
			window.location.href = "/HTML/home.html";
		});
	}
}

function getQueryValue(name) {
	return new URLSearchParams(window.location.search).get(name) || "";
}

function findOrg(name) {
	const normalized = name.trim().toLowerCase();
	return readStore(ROUTE_KEYS.orgs).find((org) => org.name.toLowerCase() === normalized) || null;
}

function createOrganization({ name, adminName, adminEmail, adminPassword }) {
	const org = {
		id: `org_${Date.now()}`,
		name: name.trim(),
		adminName: adminName.trim(),
		adminEmail: adminEmail.trim().toLowerCase(),
		adminPassword,
		createdAt: new Date().toISOString(),
		members: []
	};

	const orgs = readStore(ROUTE_KEYS.orgs);
	orgs.push(org);
	writeStore(ROUTE_KEYS.orgs, orgs);
	localStorage.setItem(ROUTE_KEYS.activeOrg, JSON.stringify(org));
	return org;
}

function requestOrgAccess({ fullName, email, password, orgName }) {
	const org = findOrg(orgName);
	const request = {
		id: `req_${Date.now()}`,
		fullName: fullName.trim(),
		email: email.trim().toLowerCase(),
		password,
		orgName: orgName.trim(),
		status: org ? "pending" : "org-not-found",
		createdAt: new Date().toISOString()
	};

	const requests = readStore(ROUTE_KEYS.requests);
	requests.push(request);
	writeStore(ROUTE_KEYS.requests, requests);
	localStorage.setItem(ROUTE_KEYS.pendingRequest, JSON.stringify(request));
	return request;
}

function updateRequestStatus(requestId, status) {
	const requests = readStore(ROUTE_KEYS.requests);
	let updatedRequest = null;
	const nextRequests = requests.map((request) => {
		if (request.id !== requestId) {
			return request;
		}

		updatedRequest = {
			...request,
			status
		};
		return updatedRequest;
	});

	writeStore(ROUTE_KEYS.requests, nextRequests);
	if (updatedRequest) {
		localStorage.setItem(ROUTE_KEYS.pendingRequest, JSON.stringify(updatedRequest));
	}

	if (status === "approved" && updatedRequest) {
		const orgs = readStore(ROUTE_KEYS.orgs);
		const orgIndex = orgs.findIndex((org) => org.name.toLowerCase() === updatedRequest.orgName.toLowerCase());
		if (orgIndex >= 0) {
			const org = orgs[orgIndex];
			const members = Array.isArray(org.members) ? org.members : [];
			const existingMember = members.some((member) => member.email?.toLowerCase() === updatedRequest.email.toLowerCase());
			if (!existingMember) {
				members.push({
					fullName: updatedRequest.fullName,
					email: updatedRequest.email,
					role: "User",
					joinedAt: new Date().toISOString()
				});
			}
			orgs[orgIndex] = {
				...org,
				members
			};
			writeStore(ROUTE_KEYS.orgs, orgs);
		}
	}

	return updatedRequest;
}

function approveRequestById(requestId) {
	return updateRequestStatus(requestId, "approved");
}

function denyRequestById(requestId) {
	return updateRequestStatus(requestId, "denied");
}

function approvePendingRequest() {
	const pending = JSON.parse(localStorage.getItem(ROUTE_KEYS.pendingRequest) || "null");
	if (!pending) {
		return null;
	}

	pending.status = "approved";
	const requests = readStore(ROUTE_KEYS.requests).map((request) =>
		request.id === pending.id ? pending : request
	);

	writeStore(ROUTE_KEYS.requests, requests);
	localStorage.setItem(ROUTE_KEYS.pendingRequest, JSON.stringify(pending));
	return pending;
}

function initRegisterPage() {
	const orgButton = document.querySelector("[data-register-org]");
	const userButton = document.querySelector("[data-register-user]");

	if (orgButton) {
		orgButton.addEventListener("click", () => {
			window.location.href = "/HTML/register-org.html";
		});
	}

	if (userButton) {
		userButton.addEventListener("click", () => {
			window.location.href = "/HTML/register-user.html";
		});
	}
}

function initLoginForm() {
	const form = document.getElementById("loginForm");
	if (!form) {
		return;
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const formData = new FormData(form);
		const email = String(formData.get("email") || "").trim().toLowerCase();
		const password = String(formData.get("password") || "");
		const errorEl = document.getElementById("loginError");

		try {
			const data = await apiLogin(email, password);
			saveSessionUser({ email, role: data.role, company_id: data.company_id, loggedInAt: new Date().toISOString() });
			window.location.href = "/HTML/company.html";
		} catch (err) {
			if (errorEl) errorEl.textContent = err.message;
			else alert(err.message);
		}
	});
}

async function initAccountPage() {
	const accountForm = document.getElementById("accountForm");
	if (!accountForm) {
		return;
	}

	const orgSelect = document.getElementById("accountOrgSelect");
	const photoInput = document.getElementById("profilePhoto");
	const photoPreview = document.getElementById("profilePhotoPreview");
	const accountEmail = document.getElementById("accountEmail");
	const activeOrgLabel = document.getElementById("activeOrgLabel");
	const fullNameInput = document.getElementById("accountFullName");
	const titleInput = document.getElementById("accountTitle");

    let profileData = { email: "", role: "", companyName: "" };
    try {
        const me = await apiMe();
        const res = await fetch(`${API_BASE}/company`, { headers: authHeaders() });
        const company = await res.json();
        profileData = { email: me.email, role: me.role, companyName: company.name };
    } catch (err) {
        console.error("Failed to load backend profile data:", err);
    }

	if (orgSelect && profileData.companyName) {
		orgSelect.innerHTML = `<option value="${profileData.companyName}" selected>${profileData.companyName}</option>`;
        orgSelect.disabled = true; // User belongs to exactly one company
	}

	if (accountEmail) {
		accountEmail.textContent = profileData.email;
	}

	if (activeOrgLabel) {
		activeOrgLabel.textContent = profileData.companyName;
	}

    if (titleInput) {
        titleInput.value = profileData.role === "admin" ? "Admin" : "Employee";
        titleInput.disabled = true; // Role is managed by backend
    }

	const savedProfile = getAccountProfile();
    const profile = savedProfile || { emailAliases: [] };

	if (fullNameInput) {
		fullNameInput.value = profile.fullName || profileData.email.split("@")[0] || "CCM User";
	}
	if (photoPreview && profile.photo) {
		photoPreview.src = profile.photo;
	}

	const aliasList = document.getElementById("accountEmailAliases");
	const aliasInput = document.getElementById("accountEmailAliasInput");
	const addAliasButton = document.getElementById("addAliasButton");


	function renderAliases() {
		if (!aliasList) {
			return;
		}

		const aliases = Array.isArray(profile.emailAliases) ? profile.emailAliases : [];
		aliasList.innerHTML = aliases.length
			? aliases.map((email) => `<div><span class="summary-label">Login Email</span><strong>${email}</strong></div>`).join("")
			: `<p class="account-status">No secondary login emails added yet.</p>`;
	}

	renderAliases();

	if (addAliasButton && aliasInput) {
		addAliasButton.addEventListener("click", () => {
			const value = String(aliasInput.value || "").trim().toLowerCase();
			if (!value) {
				return;
			}

			const aliases = Array.isArray(profile.emailAliases) ? profile.emailAliases : [];
			if (!aliases.includes(value) && value !== profile.email.toLowerCase()) {
				aliases.push(value);
				profile.emailAliases = aliases;
				saveAccountProfile(profile);
				renderAliases();
				aliasInput.value = "";
			}
		});
	}

	if (photoInput) {
		photoInput.addEventListener("change", () => {
			const file = photoInput.files && photoInput.files[0];
			if (!file) {
				return;
			}

			const reader = new FileReader();
			reader.onload = () => {
				if (photoPreview) {
					photoPreview.src = String(reader.result || "");
				}
			};
			reader.readAsDataURL(file);
		});
	}

	accountForm.addEventListener("submit", (event) => {
		event.preventDefault();
		const nextProfile = {
			fullName: String(fullNameInput?.value || profile.fullName).trim(),
			email: profile.email,
			organization: String(orgSelect?.value || profile.organization),
			title: String(titleInput?.value || profile.title).trim(),
			photo: photoPreview?.src || profile.photo || "",
			emailAliases: Array.isArray(profile.emailAliases) ? profile.emailAliases : []
		};

		saveAccountProfile(nextProfile);
		const status = document.getElementById("accountSaveStatus");
		if (status) {
			status.textContent = "Account saved.";
		}

		if (activeOrgLabel) {
			activeOrgLabel.textContent = nextProfile.organization;
		}
	});

	const logoutButton = document.getElementById("logoutButton");
	if (logoutButton) {
		logoutButton.addEventListener("click", () => {
			clearSessionUser();
			window.location.href = "/HTML/home.html";
		});
	}
}

function initOrgForm() {
	const form = document.getElementById("orgCreateForm");
	if (!form) {
		return;
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const formData = new FormData(form);
		const email = String(formData.get("adminEmail") || "").trim().toLowerCase();
		const username = String(formData.get("adminName") || "").trim();
		const password = String(formData.get("adminPassword") || "");
		const company_name = String(formData.get("orgName") || "").trim();
		const errorEl = document.getElementById("orgError");

		try {
			const data = await apiRegisterOrg(email, username, password, company_name);
			saveSessionUser({ email, role: data.role, company_id: data.company_id, loggedInAt: new Date().toISOString() });
			window.location.href = `/HTML/org-created.html?org=${encodeURIComponent(company_name)}`;
		} catch (err) {
			if (errorEl) errorEl.textContent = err.message;
			else alert(err.message);
		}
	});
}

function initUserForm() {
	const form = document.getElementById("userJoinForm");
	if (!form) {
		return;
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const formData = new FormData(form);
		const username = String(formData.get("userName") || "").trim();
		const email = String(formData.get("userEmail") || "").trim().toLowerCase();
		const password = String(formData.get("employeePassword") || "");
		const company_name = String(formData.get("orgSearch") || "").trim();
		const errorEl = document.getElementById("userError");

		try {
			const data = await apiRegisterUser(email, username, password, company_name);
			saveSessionUser({ email, role: data.role, company_id: data.company_id, loggedInAt: new Date().toISOString() });
			window.location.href = `/HTML/company.html`;
		} catch (err) {
			if (errorEl) errorEl.textContent = err.message;
			else alert(err.message);
		}
	});
}

function initPendingPage() {
	const statusBadge = document.querySelector("[data-pending-status]");
	if (!statusBadge) {
		return;
	}

	const pending = JSON.parse(localStorage.getItem(ROUTE_KEYS.pendingRequest) || "null");
	const status = getQueryValue("status") || (pending && pending.status) || "pending";
	const orgName = getQueryValue("org") || (pending && pending.orgName) || "your organization";

	const statusText = status === "approved"
		? "Approved"
		: status === "org-not-found"
			? "Organization not found"
			: "Pending";

	statusBadge.textContent = statusText;
	const orgLabel = document.querySelector("[data-pending-org]");
	if (orgLabel) {
		orgLabel.textContent = orgName;
	}
}

function initOrgCreatedPage() {
	const orgLabel = document.querySelector("[data-created-org]");
	if (!orgLabel) {
		return;
	}

	const orgName = getQueryValue("org") || "your organization";
	orgLabel.textContent = orgName;
}

function initCompanyPage() {
	const page = document.getElementById("companyPage");
	if (!page) {
		return;
	}

	const orgInfo = document.getElementById("companyInfo");
	const uploadArea = document.getElementById("companyUploadArea");
	const requestList = document.getElementById("companyRequestList");
	const approvedList = document.getElementById("companyApprovedList");
	const deniedList = document.getElementById("companyDeniedList");
	const chatLogList = document.getElementById("companyChatLogList");
	const membersList = document.getElementById("companyMembersList");
	const documentsList = document.getElementById("companyDocumentsList");
	const docForm = document.getElementById("companyDocForm");
	const docFileInput = document.getElementById("companyDocFile");
	const uploadStatus = document.getElementById("companyUploadStatus");

	const sessionUser = getSessionUser();
	const isAdmin = sessionUser && (sessionUser.role === "org" || sessionUser.role === "admin");
    let currentCompanyName = "";

	if (uploadArea) {
		uploadArea.style.display = isAdmin ? "block" : "none";
	}

	async function renderCompanyInfo() {
		if (!orgInfo) {
			return;
		}
		if (!sessionUser) {
			orgInfo.innerHTML = `<p class="account-status">Please log in to view company info.</p>`;
			return;
		}
		try {
			const res = await fetch(`${API_BASE}/company`, { headers: authHeaders() });
			const company = await res.json();
			if (!res.ok) throw new Error(company.detail || "Failed to load company");
            currentCompanyName = company.name;
			orgInfo.innerHTML = `
				<div class="account-summary">
					<div><span class="summary-label">Organization</span><strong>${company.name}</strong></div>
					<div><span class="summary-label">Members</span><strong>${company.member_count}</strong></div>
					<div><span class="summary-label">Your Role</span><strong>${company.role}</strong></div>
				</div>
			`;
		} catch (err) {
			orgInfo.innerHTML = `<p class="account-status">Could not load organization info: ${err.message}</p>`;
		}
	}

	async function renderDocuments() {
		if (!documentsList) {
			return;
		}
		if (!sessionUser) {
			documentsList.innerHTML = `<p class="account-status">Please log in to view documents.</p>`;
			return;
		}
		try {
			const docs = await apiListPolicies();
			if (!docs.length) {
				documentsList.innerHTML = isAdmin
					? `<p class="account-status">No policy documents uploaded yet. Use the upload form above.</p>`
					: `<p class="account-status">No policy documents available yet.</p>`;
				return;
			}
			documentsList.innerHTML = docs.map((doc) => `
				<article class="play-card">
					<span class="tag approved">Policy</span>
					<h3>${doc.title || doc.filename}</h3>
					<p>${doc.filename}</p>
					${isAdmin ? `<button class="btn btn-secondary" type="button" data-delete-doc="${doc._id}" style="margin-top:8px;">Delete</button>` : ""}
				</article>
			`).join("");
		} catch (err) {
			documentsList.innerHTML = `<p class="account-status">Could not load documents: ${err.message}</p>`;
		}
	}

	function renderRequests() {
		if (!requestList) {
			return;
		}
		const allRequests = readStore(ROUTE_KEYS.requests) || [];
		const requests = allRequests.filter(r => r.orgName === currentCompanyName);
		const pendingRequests = requests.filter((r) => r.status === "pending");
		if (!pendingRequests.length) {
			requestList.innerHTML = `<p class="account-status">No pending requests.</p>`;
			return;
		}
		requestList.innerHTML = pendingRequests.map((request) => `
			<article class="play-card">
				<span class="tag warning">${request.status}</span>
				<h3>${request.fullName}</h3>
				<p><strong>Email:</strong> ${request.email}</p>
				<p><strong>Organization:</strong> ${request.orgName}</p>
				<div class="hero-cta">
					<button class="btn btn-primary" type="button" data-approve-request="${request.id}">Approve</button>
					<button class="btn btn-secondary" type="button" data-deny-request="${request.id}">Deny</button>
				</div>
			</article>
		`).join("");
	}

	function renderHistory() {
		const allRequests = readStore(ROUTE_KEYS.requests) || [];
		const requests = allRequests.filter(r => r.orgName === currentCompanyName);
		const approved = requests.filter((r) => r.status === "approved");
		const denied = requests.filter((r) => r.status === "denied");
		if (approvedList) {
			approvedList.innerHTML = approved.length
				? approved.map((r) => `<div><span class="summary-label">${r.fullName}</span><strong>${r.email}</strong></div>`).join("")
				: `<p class="account-status">No approved users yet.</p>`;
		}
		if (deniedList) {
			deniedList.innerHTML = denied.length
				? denied.map((r) => `<div><span class="summary-label">${r.fullName}</span><strong>${r.email}</strong></div>`).join("")
				: `<p class="account-status">No denied users yet.</p>`;
		}
	}

	function renderMembers() {
		if (!membersList) {
			return;
		}
		membersList.innerHTML = `<p class="account-status">Member management coming soon.</p>`;
	}

	function renderChatLogs() {
		if (!chatLogList) {
			return;
		}
		if (!isAdmin) {
			chatLogList.innerHTML = `<p class="account-status">Chat logs are visible to admin accounts only.</p>`;
			return;
		}
		const allLogs = getStoredChatLogs();
		const logs = allLogs.filter(log => log.orgScope === currentCompanyName);

		if (!logs.length) {
			chatLogList.innerHTML = `<p class="account-status">No chat logs available yet for ${currentCompanyName || 'this organization'}.</p>`;
			return;
		}
		chatLogList.innerHTML = logs.map((log) => `
			<article class="play-card">
				<span class="tag ${log.verdict === "Approved" ? "approved" : log.verdict === "Prohibited" ? "prohibited" : "warning"}">${log.verdict}</span>
				<h3>${log.question}</h3>
				<p><strong>Response:</strong> ${log.response}</p>
				<p><strong>Time:</strong> ${new Date(log.createdAt).toLocaleString()}</p>
			</article>
		`).join("");
	}

	async function refresh() {
		await renderCompanyInfo();
		await renderDocuments();
		renderRequests();
		renderHistory();
		renderMembers();
		renderChatLogs();
	}

	page.addEventListener("click", async (event) => {
		const approveButton = event.target.closest("[data-approve-request]");
		const denyButton = event.target.closest("[data-deny-request]");
		const deleteDocButton = event.target.closest("[data-delete-doc]");

		if (approveButton) {
			approveRequestById(approveButton.getAttribute("data-approve-request"));
			renderRequests();
			renderHistory();
		}
		if (denyButton) {
			denyRequestById(denyButton.getAttribute("data-deny-request"));
			renderRequests();
			renderHistory();
		}
		if (deleteDocButton) {
			const docId = deleteDocButton.getAttribute("data-delete-doc");
			deleteDocButton.disabled = true;
			deleteDocButton.textContent = "Deleting…";
			try {
				await apiDeletePolicy(docId);
				await renderDocuments();
			} catch (err) {
				deleteDocButton.disabled = false;
				deleteDocButton.textContent = "Delete";
				alert(`Delete failed: ${err.message}`);
			}
		}
	});

	if (docForm && docFileInput) {
		docForm.addEventListener("submit", async (event) => {
			event.preventDefault();
			const file = docFileInput.files && docFileInput.files[0];
			if (!file) {
				return;
			}
			if (uploadStatus) uploadStatus.textContent = "Uploading…";
			try {
				const result = await apiUploadPolicy(file);
				if (uploadStatus) uploadStatus.textContent = result.message || "Uploaded successfully.";
				docForm.reset();
				await renderDocuments();
			} catch (err) {
				if (uploadStatus) uploadStatus.style.color = "#f87171";
				if (uploadStatus) uploadStatus.textContent = `Error: ${err.message}`;
			}
		});
	}

	refresh();
}

function initRoutes() {
	initRegisterPage();
	initLoginForm();
	initOrgForm();
	initUserForm();
	initPendingPage();
	initOrgCreatedPage();
	initAccountPage();
	initCompanyPage();
}

document.addEventListener("DOMContentLoaded", initRoutes);
