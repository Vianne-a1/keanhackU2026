const schemaSections = [
    {
        title: "Organizations",
        rows: [
            ["org_id", "UUID (PK)", "Unique identifier for the company."],
            ["org_name", "String", "Name of the organization."],
            ["created_at", "Timestamp", "When the org was created."]
        ]
    },
    {
        title: "Users",
        rows: [
            ["user_id", "UUID (PK)", "Unique identifier for the employee."],
            ["org_id", "UUID (FK)", "Links the user to their specific organization."],
            ["full_name", "String", "Employee name."],
            ["email", "String", "Corporate email (unique)."],
            ["role", "Enum", "Admin (uploads docs) or User (asks questions)."]
        ]
    },
    {
        title: "Documents",
        rows: [
            ["doc_id", "UUID (PK)", "Unique identifier for the document."],
            ["org_id", "UUID (FK)", "Ensures org-scoped retrieval only."],
            ["file_name", "String", "Example: Travel_Policy_2026.pdf"],
            ["upload_date", "Timestamp", "Supports priority weighting (newer > older)."],
            ["vector_namespace", "String", "Reference to embeddings location in vector DB."]
        ]
    },
    {
        title: "Audit Logs",
        rows: [
            ["audit_id", "UUID (PK)", "Primary key."],
            ["user_id", "UUID", "Who ran the check."],
            ["verdict", "String", "Safe, Warning, or Red Flag."],
            ["risk_factors", "JSON", "Detected issues, such as unusual renewal clause."]
        ]
    }
];

function getNavSessionUser() {
    try {
        return JSON.parse(localStorage.getItem("CCM_session_user") || "null");
    } catch {
        return null;
    }
}

function renderSessionNav() {
    const navs = document.querySelectorAll(".site-nav");
    if (!navs.length) {
        return;
    }

    const loggedIn = Boolean(getNavSessionUser());
    const links = loggedIn
        ? [
            ["/HTML/home.html", "Home"],
            ["/HTML/policy.html", "Policy"],
            ["/HTML/fraudness.html", "Fraud/Fairness"],
            ["/HTML/account.html", "Account"],
            ["/HTML/company.html", "Company"]
        ]
        : [
            ["/HTML/home.html", "Home"],
            ["/HTML/policy.html", "Policy"],
            ["/HTML/fraudness.html", "Fraud/Fairness"],
            ["/HTML/login.html", "Login"],
            ["/HTML/register.html", "Register"]
        ];

    navs.forEach((nav) => {
        nav.innerHTML = links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("");
    });
}

function renderSchemaTables() {
    const container = document.getElementById("schemaGrid");
    if (!container) {
        return;
    }

    container.innerHTML = schemaSections
        .map((section) => {
            const rowsHtml = section.rows
                .map(
                    (row) =>
                        `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td><td>${row[2]}</td></tr>`
                )
                .join("");

            return `
                <article class="table-wrap">
                    <h3>${section.title}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Column</th>
                                <th>Type</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </article>
            `;
        })
        .join("");
}

function getPolicyChatLogs() {
    try {
        return JSON.parse(localStorage.getItem("CCM_chat_logs") || "[]");
    } catch {
        return [];
    }
}

function savePolicyChatLog(entry) {
    const logs = getPolicyChatLogs();
    logs.unshift(entry);
    localStorage.setItem("CCM_chat_logs", JSON.stringify(logs.slice(0, 25)));
}

function runPolicyCheck() {
    const scenario = document.getElementById("scenario").value;
    const amount = Number(document.getElementById("amount").value || 0);
    const approvedVendor = document.getElementById("approvedVendor").checked;
    const securityReview = document.getElementById("securityReview").checked;
    const output = document.getElementById("policyResult");

    const reasons = [];
    let verdict = "Approved";
    let cssClass = "approved";

    if (scenario === "software") {
        reasons.push("Procurement policy check: software purchases above $1000 need manager approval.");
        if (amount > 1000) {
            verdict = "Flagged";
            cssClass = "flagged";
            reasons.push("Budget threshold exceeded for auto-approval.");
        }
        reasons.push("IT security policy check: vendor must be approved.");
        if (!approvedVendor) {
            verdict = "Prohibited";
            cssClass = "prohibited";
            reasons.push("Vendor not on approved list.");
        }
    }

    if (scenario === "data") {
        reasons.push("Data policy check: sharing customer data requires security review.");
        if (!securityReview) {
            verdict = "Prohibited";
            cssClass = "prohibited";
            reasons.push("Missing security review for data handling.");
        }
    }

    if (scenario === "vendor") {
        reasons.push("Vendor onboarding policy check: approved vendor and review are required.");
        if (!approvedVendor || !securityReview) {
            verdict = "Flagged";
            cssClass = "flagged";
            if (!approvedVendor) {
                reasons.push("Vendor requires due diligence before collaboration.");
            }
            if (!securityReview) {
                reasons.push("Security review is pending.");
            }
        }
    }

    output.innerHTML = `
        <span class="tag ${cssClass}">${verdict}</span>
        <strong>${verdict} Verdict</strong>
        <p>${reasons.join(" ")}</p>
    `;
}

function runContractAudit() {
    const text = document.getElementById("contractText").value.toLowerCase();
    const output = document.getElementById("auditResult");

    const checks = [
        {
            label: "Automatic long-term renewal",
            regex: /(auto[- ]?renew|automatic renewal|5 years|five years)/
        },
        {
            label: "Potential hidden service fee",
            regex: /(service fee|processing fee|administrative fee|additional fee)/
        },
        {
            label: "Unusual payment/bank account change",
            regex: /(bank account change|wire to new account|updated payment destination)/
        },
        {
            label: "Ghost service risk",
            regex: /(advisory retainer|miscellaneous support|undefined service)/
        }
    ];

    const findings = checks.filter((item) => item.regex.test(text)).map((item) => item.label);

    let verdict = "Safe";
    let cssClass = "safe";

    if (findings.length >= 3) {
        verdict = "Red Flag";
        cssClass = "red-flag";
    } else if (findings.length >= 1) {
        verdict = "Warning";
        cssClass = "warning";
    }

    const list = findings.length
        ? `<ul>${findings.map((item) => `<li>${item}</li>`).join("")}</ul>`
        : "<p>No major fraud/fairness indicators were detected in this sample.</p>";

    output.innerHTML = `
        <span class="tag ${cssClass}">${verdict}</span>
        <strong>${verdict} Audit Result</strong>
        ${list}
    `;
}

function evaluatePolicyQuestion(question, orgScope) {
    const normalized = question.toLowerCase();
    const facts = [];
    let verdict = "Approved";
    let cssClass = "approved";

    if (/(share|send|export|customer data|confidential|personal data)/.test(normalized)) {
        verdict = "Prohibited";
        cssClass = "prohibited";
        facts.push("Data sharing requires security review and approved handling.");
    }

    if (/(software|purchase|vendor|subscription|tool|license)/.test(normalized)) {
        if (verdict !== "Prohibited") {
            verdict = "Flagged";
            cssClass = "flagged";
        }
        facts.push("Procurement policy requires review before buying software or onboarding a vendor.");
    }

    if (/(approved vendor|security review|manager approved|already approved)/.test(normalized)) {
        if (verdict === "Flagged") {
            verdict = "Approved";
            cssClass = "approved";
        }
        facts.push("The question mentions an approval control that supports compliance.");
    }

    if (/urgent|asap|emergency/.test(normalized) && verdict === "Approved") {
        verdict = "Flagged";
        cssClass = "flagged";
        facts.push("Urgent purchasing still needs the normal control checks.");
    }

    if (!facts.length) {
        facts.push("No high-risk policy trigger was detected in the question.");
    }

    const explanation = verdict === "Approved"
        ? `For ${orgScope}, CCM did not find a blocking policy issue. Please keep the request documented and follow the normal approval trail.`
        : verdict === "Flagged"
            ? `For ${orgScope}, this looks reviewable but not automatically blocked. Please confirm procurement, security, or manager approval before proceeding.`
            : `For ${orgScope}, this request is not allowed until a policy exception or security review is completed.`;

    return {
        verdict,
        cssClass,
        facts,
        explanation
    };
}

function appendPolicyBubble(thread, type, label, content, meta = []) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${type}`;

    bubble.innerHTML = `
        <div class="bubble-label">${label}</div>
        <div class="bubble-content">${content}</div>
        ${meta.length ? `<div class="chat-meta">${meta.map((item) => `<span class="chat-chip">${item}</span>`).join("")}</div>` : ""}
    `;

    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
}

function initPolicyChatPage() {
    const form = document.getElementById("policyForm");
    const workspace = document.getElementById("policyWorkspace");
    const thread = document.getElementById("policyChatThread");

    if (!form || !workspace || !thread) {
        return;
    }

    const orgScopeSelect = document.getElementById("orgScope");
    if (orgScopeSelect && getToken()) {
        fetch(`${API_BASE}/company`, { headers: authHeaders() })
            .then((r) => r.json())
            .then((company) => {
                if (company.name) {
                    orgScopeSelect.innerHTML = `<option>${company.name}</option>`;
                }
            })
            .catch(() => {});
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const questionInput = document.getElementById("question");
        const orgScopeInput = document.getElementById("orgScope");
        const question = String(questionInput?.value || "").trim();
        const orgScope = String(orgScopeInput?.value || "Your Organization");

        if (!question) {
            return;
        }

        workspace.classList.add("chat-mode");
        appendPolicyBubble(thread, "user", "You", question, [orgScope]);

        const thinkingId = `thinking-${Date.now()}`;
        const thinkingBubble = document.createElement("div");
        thinkingBubble.className = "chat-bubble assistant";
        thinkingBubble.id = thinkingId;
        thinkingBubble.innerHTML = `<div class="bubble-label">CCM Assistant</div><div class="bubble-content">Analyzing policies…</div>`;
        thread.appendChild(thinkingBubble);
        thread.scrollTop = thread.scrollHeight;
        questionInput.value = "";

        try {
            const data = await apiChat(question);
            const verdictLabel = {
                approved: "Approved",
                needs_approval: "Needs Approval",
                prohibited: "Prohibited",
                red_flag: "Red Flag"
            }[data.verdict] || data.verdict;

            const citationsHtml = data.citations?.length
                ? `<ul>${data.citations.map(c => `<li>${c}</li>`).join("")}</ul>`
                : "";

            thinkingBubble.querySelector(".bubble-content").innerHTML =
                `<strong>${verdictLabel}</strong><p>${data.reasoning}</p>${citationsHtml}`;

            savePolicyChatLog({
                question,
                orgScope,
                verdict: verdictLabel,
                response: data.reasoning,
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            thinkingBubble.querySelector(".bubble-content").innerHTML =
                `<span style="color:#f87171">Error: ${err.message}</span>`;
        }
    });
}

function setupRevealAnimations() {
    const revealItems = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.15
        }
    );

    revealItems.forEach((item) => observer.observe(item));
}

function init() {
    renderSchemaTables();
    renderSessionNav();
    setupRevealAnimations();
    initPolicyChatPage();

    const runPolicyButton = document.getElementById("runPolicy");
    const runAuditButton = document.getElementById("runAudit");

    if (runPolicyButton) {
        runPolicyButton.addEventListener("click", runPolicyCheck);
        runPolicyCheck();
    }

    if (runAuditButton) {
        runAuditButton.addEventListener("click", runContractAudit);
    }
}

document.addEventListener("DOMContentLoaded", init);
