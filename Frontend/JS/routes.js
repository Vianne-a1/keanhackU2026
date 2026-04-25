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

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const formData = new FormData(form);
		const email = String(formData.get("email") || "").trim().toLowerCase();
		const sessionUser = {
			email,
			loggedInAt: new Date().toISOString()
		};

		saveSessionUser(sessionUser);
		window.location.href = "/HTML/company.html";
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

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const formData = new FormData(form);
		const org = createOrganization({
			name: String(formData.get("orgName") || ""),
			adminName: String(formData.get("adminName") || ""),
			adminEmail: String(formData.get("adminEmail") || ""),
			adminPassword: String(formData.get("adminPassword") || "")
		});

		window.location.href = `/HTML/org-created.html?org=${encodeURIComponent(org.name)}`;
	});
}

function initUserForm() {
	const form = document.getElementById("userJoinForm");
	if (!form) {
		return;
	}

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const formData = new FormData(form);
		const request = requestOrgAccess({
			fullName: String(formData.get("userName") || ""),
			email: String(formData.get("userEmail") || ""),
			password: String(formData.get("employeePassword") || ""),
			orgName: String(formData.get("orgSearch") || "")
		});

		window.location.href = `/HTML/user-pending.html?org=${encodeURIComponent(request.orgName)}&status=${request.status}`;
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

	const orgSelect = document.getElementById("companyOrgSelect");
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
	const docNameInput = document.getElementById("companyDocName");
	const requests = readStore(ROUTE_KEYS.requests);
	const documents = getStoredDocuments();
	const orgs = getOrganizations();
	const activeOrg = JSON.parse(localStorage.getItem(ROUTE_KEYS.activeOrg) || "null");
	const availableOrgs = orgs.length ? orgs : activeOrg ? [activeOrg] : [];
	let selectedOrgName = activeOrg?.name || availableOrgs[0]?.name || "";

	function renderOrgOptions() {
		if (!orgSelect) {
			return;
		}

		orgSelect.innerHTML = availableOrgs
			.map((org) => `<option value="${org.name}">${org.name}</option>`)
			.join("");
		if (selectedOrgName) {
			orgSelect.value = selectedOrgName;
		}
	}

	function renderCompanyInfo() {
		const org = findOrg(selectedOrgName) || activeOrg || availableOrgs[0] || null;
		if (!orgInfo || !org) {
			if (orgInfo) {
				orgInfo.innerHTML = `<p>No organization available yet. Create one from the registration flow.</p>`;
			}
			return null;
		}

		const memberCount = Array.isArray(org.members) ? org.members.length : 0;
		const adminMode = isOrgAdmin(org);
		if (uploadArea) {
			uploadArea.style.display = adminMode ? "block" : "none";
		}
		orgInfo.innerHTML = `
			<div class="account-summary">
				<div><span class="summary-label">Organization Name</span><strong>${org.name}</strong></div>
				<div><span class="summary-label">Admin</span><strong>${org.adminName}</strong></div>
				<div><span class="summary-label">Admin Email</span><strong>${org.adminEmail}</strong></div>
				<div><span class="summary-label">Created</span><strong>${new Date(org.createdAt).toLocaleString()}</strong></div>
				<div><span class="summary-label">Member Count</span><strong>${memberCount}</strong></div>
			</div>
		`;
		return org;
	}

	function renderRequests() {
		if (!requestList) {
			return;
		}

		const currentOrg = findOrg(selectedOrgName) || activeOrg || availableOrgs[0] || null;
		const currentRequests = requests.filter((request) => request.orgName.toLowerCase() === currentOrg?.name?.toLowerCase() && request.status === "pending");

		if (!currentRequests.length) {
			requestList.innerHTML = `<p class="account-status">No pending requests for this organization.</p>`;
			return;
		}

		requestList.innerHTML = currentRequests
			.map((request) => {
				const labelClass = request.status === "approved" ? "approved" : request.status === "denied" ? "prohibited" : "warning";
				const actionButtons = request.status === "pending"
					? `
						<button class="btn btn-primary" type="button" data-approve-request="${request.id}">Approve</button>
						<button class="btn btn-secondary" type="button" data-deny-request="${request.id}">Deny</button>
					`
					: `<p class="account-status">Already ${request.status}.</p>`;

				return `
					<article class="play-card">
						<span class="tag ${labelClass}">${request.status}</span>
						<h3>${request.fullName}</h3>
						<p><strong>Email:</strong> ${request.email}</p>
						<p><strong>Organization:</strong> ${request.orgName}</p>
						<div class="hero-cta">${actionButtons}</div>
					</article>
				`;
			})
			.join("");
	}

	function renderHistory() {
		const currentOrg = findOrg(selectedOrgName) || activeOrg || availableOrgs[0] || null;
		const currentApproved = requests.filter((request) => request.orgName.toLowerCase() === currentOrg?.name?.toLowerCase() && request.status === "approved");
		const currentDenied = requests.filter((request) => request.orgName.toLowerCase() === currentOrg?.name?.toLowerCase() && request.status === "denied");

		if (approvedList) {
			approvedList.innerHTML = currentApproved.length
				? currentApproved.map((request) => `
					<div>
						<span class="summary-label">${request.fullName}</span>
						<strong>${request.email}</strong>
					</div>
				`).join("")
				: `<p class="account-status">No approved users yet.</p>`;
		}

		if (deniedList) {
			deniedList.innerHTML = currentDenied.length
				? currentDenied.map((request) => `
					<div>
						<span class="summary-label">${request.fullName}</span>
						<strong>${request.email}</strong>
					</div>
				`).join("")
				: `<p class="account-status">No denied users yet.</p>`;
		}
	}

	function renderMembers() {
		if (!membersList) {
			return;
		}

		const currentOrg = findOrg(selectedOrgName) || activeOrg || availableOrgs[0] || null;
		const members = Array.isArray(currentOrg?.members) ? currentOrg.members : [];

		if (!members.length) {
			membersList.innerHTML = `<p class="account-status">No members have been approved yet.</p>`;
			return;
		}

		membersList.innerHTML = members
			.map((member) => `
				<div class="account-summary">
					<div><span class="summary-label">Name</span><strong>${member.fullName}</strong></div>
					<div><span class="summary-label">Email</span><strong>${member.email}</strong></div>
					<div><span class="summary-label">Role</span><strong>${member.role || "User"}</strong></div>
				</div>
			`)
			.join("");
	}

	function renderChatLogs() {
		if (!chatLogList) {
			return;
		}

		const currentOrg = findOrg(selectedOrgName) || activeOrg || availableOrgs[0] || null;
		if (!isOrgAdmin(currentOrg)) {
			chatLogList.innerHTML = `<p class="account-status">Chat logs are visible to admin accounts only.</p>`;
			return;
		}

		const logs = getStoredChatLogs().filter((log) => log.orgScope.toLowerCase() === currentOrg?.name?.toLowerCase());
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

	function renderDocuments() {
		if (!documentsList) {
			return;
		}

		const currentOrg = findOrg(selectedOrgName) || activeOrg || availableOrgs[0] || null;
		const currentDocuments = documents.filter((doc) => doc.orgName.toLowerCase() === currentOrg?.name?.toLowerCase());
		const adminMode = isOrgAdmin(currentOrg);

		if (!currentDocuments.length) {
			documentsList.innerHTML = adminMode
				? `<p class="account-status">No documents uploaded yet. Use the upload form to add required documents.</p>`
				: `<p class="account-status">No required documents available yet.</p>`;
			return;
		}

		documentsList.innerHTML = currentDocuments.map((doc) => {
			const docActions = adminMode
				? `<button class="btn btn-secondary" type="button" data-remove-doc="${doc.id}">Remove</button>`
				: `<a class="btn btn-secondary" href="${doc.downloadUrl || '#'}" download="${doc.fileName}">Download</a>`;

			return `
				<article class="play-card">
					<span class="tag approved">Required Doc</span>
					<h3>${doc.fileName}</h3>
					<p>${doc.summary || "Company document"}</p>
					<div class="hero-cta">${docActions}</div>
				</article>
			`;
		}).join("");
	}

	function refresh() {
		renderOrgOptions();
		renderCompanyInfo();
		renderDocuments();
		renderRequests();
		renderHistory();
		renderMembers();
		renderChatLogs();
	}

	if (orgSelect) {
		orgSelect.addEventListener("change", () => {
			selectedOrgName = orgSelect.value;
			refresh();
		});
	}

	page.addEventListener("click", (event) => {
		const approveButton = event.target.closest("[data-approve-request]");
		const denyButton = event.target.closest("[data-deny-request]");
		const removeButton = event.target.closest("[data-remove-doc]");

		if (approveButton) {
			approveRequestById(approveButton.getAttribute("data-approve-request"));
			refresh();
		}

		if (denyButton) {
			denyRequestById(denyButton.getAttribute("data-deny-request"));
			refresh();
		}

		if (removeButton) {
			const docId = removeButton.getAttribute("data-remove-doc");
			const nextDocuments = documents.filter((doc) => doc.id !== docId);
			saveStoredDocuments(nextDocuments);
			refresh();
		}
	});

	if (docForm && docFileInput && docNameInput) {
		docForm.addEventListener("submit", (event) => {
			event.preventDefault();
			const currentOrg = findOrg(selectedOrgName) || activeOrg || availableOrgs[0] || null;
			const file = docFileInput.files && docFileInput.files[0];
			const displayName = String(docNameInput.value || file?.name || "Required Document").trim();
			if (!file || !currentOrg || !isOrgAdmin(currentOrg)) {
				return;
			}

			const reader = new FileReader();
			reader.onload = () => {
				const nextDocuments = [
					...documents,
					{
						id: `doc_${Date.now()}`,
						orgName: currentOrg.name,
						fileName: displayName,
						summary: "Uploaded company document",
						content: String(reader.result || ""),
						downloadUrl: String(reader.result || ""),
						uploadedAt: new Date().toISOString()
					}
				];
				saveStoredDocuments(nextDocuments);
				docForm.reset();
				refresh();
			};
			reader.readAsDataURL(file);
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
