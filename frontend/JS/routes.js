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
		return JSON.parse(localStorage.getItem(ROUTE_KEYS.accountProfile) || "null");
	} catch {
		return null;
	}
}

function saveAccountProfile(profile) {
	localStorage.setItem(ROUTE_KEYS.accountProfile, JSON.stringify(profile));
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
	const sessionUser = getSessionUser();
	const loggedIn = Boolean(sessionUser);
	const isAdmin = sessionUser && (sessionUser.role === "org" || sessionUser.role === "admin");

	if (loggedIn) {
		const links = [
			{ href: "/HTML/home.html", label: "Home" },
			{ href: "/HTML/account.html", label: "Account" },
			{ href: "/HTML/policy.html", label: "Policy" },
			{ href: "/HTML/fraudness.html", label: "Fraud/Fairness" },
		];
		if (isAdmin) {
			links.push({ href: "/HTML/company.html", label: "Company" });
		}
		links.push({ href: "/HTML/home.html?logout=1", label: "Logout", action: true });
		return links;
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

function initAccountPage() {
	const accountForm = document.getElementById("accountForm");
	if (!accountForm) {
		return;
	}

	const orgSelect = document.getElementById("accountOrgSelect");
	const photoInput = document.getElementById("profilePhoto");
	const photoPreview = document.getElementById("profilePhotoPreview");
	const accountEmail = document.getElementById("accountEmail");
	const currentSession = getSessionUser();
	const savedProfile = getAccountProfile();
	const orgs = getOrganizations();
	const defaultOrgOptions = ["Company X", "Company Y", "CCM Demo Org"];
	const availableOrgs = orgs.length ? orgs.map((org) => org.name) : defaultOrgOptions;

	if (orgSelect) {
		orgSelect.innerHTML = availableOrgs
			.map((orgName) => `<option value="${orgName}">${orgName}</option>`)
			.join("");
	}

	const aliasList = document.getElementById("accountEmailAliases");
	const aliasInput = document.getElementById("accountEmailAliasInput");
	const addAliasButton = document.getElementById("addAliasButton");
	const savedAliases = Array.isArray(savedProfile?.emailAliases) ? savedProfile.emailAliases : [];

	const profile = savedProfile || {
		fullName: currentSession?.email ? currentSession.email.split("@")[0] : "CCM User",
		email: currentSession?.email || "user@company.com",
		organization: availableOrgs[0],
		title: "Employee",
		photo: "",
		emailAliases: []
	};

	if (accountEmail) {
		accountEmail.textContent = profile.email;
	}

	const activeOrgLabel = document.getElementById("activeOrgLabel");
	if (activeOrgLabel) {
		activeOrgLabel.textContent = profile.organization;
	}

	if (orgSelect) {
		orgSelect.value = profile.organization;
	}

	const fullNameInput = document.getElementById("accountFullName");
	const titleInput = document.getElementById("accountTitle");
	if (fullNameInput) {
		fullNameInput.value = profile.fullName;
	}
	if (titleInput) {
		titleInput.value = profile.title;
	}
	if (photoPreview && profile.photo) {
		photoPreview.src = profile.photo;
	}

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
			window.location.href = `/HTML/user-pending.html?org=${encodeURIComponent(company_name)}`;
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

	async function renderRequests() {
		if (!requestList) {
			return;
		}
		if (!isAdmin) {
			requestList.innerHTML = `<p class="account-status">Only admins can view pending requests.</p>`;
			return;
		}
		try {
			const pending = await apiGetPendingUsers();
			if (!pending.length) {
				requestList.innerHTML = `<p class="account-status">No pending requests.</p>`;
				return;
			}
			requestList.innerHTML = pending.map((u) => `
				<article class="play-card">
					<span class="tag warning">Pending</span>
					<h3>${u.username}</h3>
					<p><strong>Email:</strong> ${u.email}</p>
					<div class="hero-cta">
						<button class="btn btn-primary" type="button" data-approve-user="${u._id}">Approve</button>
						<button class="btn btn-secondary" type="button" data-deny-user="${u._id}">Deny</button>
					</div>
				</article>
			`).join("");
		} catch (err) {
			requestList.innerHTML = `<p class="account-status">Could not load requests: ${err.message}</p>`;
		}
	}

	function renderHistory() {
		if (approvedList) {
			approvedList.innerHTML = `<p class="account-status">Approved members can log in and use the Policy Agent.</p>`;
		}
		if (deniedList) {
			deniedList.innerHTML = `<p class="account-status">Denied users cannot log in.</p>`;
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
		const logs = getStoredChatLogs();
		if (!logs.length) {
			chatLogList.innerHTML = `<p class="account-status">No chat logs available yet.</p>`;
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
		await renderRequests();
		renderHistory();
		renderMembers();
		renderChatLogs();
	}

	page.addEventListener("click", async (event) => {
		const approveButton = event.target.closest("[data-approve-user]");
		const denyButton = event.target.closest("[data-deny-user]");
		const deleteDocButton = event.target.closest("[data-delete-doc]");

		if (approveButton) {
			approveButton.disabled = true;
			approveButton.textContent = "Approving…";
			try {
				await apiApproveUser(approveButton.getAttribute("data-approve-user"));
				await renderRequests();
			} catch (err) {
				alert(`Failed: ${err.message}`);
				approveButton.disabled = false;
				approveButton.textContent = "Approve";
			}
		}
		if (denyButton) {
			denyButton.disabled = true;
			denyButton.textContent = "Denying…";
			try {
				await apiDenyUser(denyButton.getAttribute("data-deny-user"));
				await renderRequests();
			} catch (err) {
				alert(`Failed: ${err.message}`);
				denyButton.disabled = false;
				denyButton.textContent = "Deny";
			}
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
