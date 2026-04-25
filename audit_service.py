def run_contract_audit(contract_text: str):
    text = contract_text.lower()

    risk_factors = []
    score = 0

    checks = [
    {
        "title": "Automatic renewal clause",
        "keywords": [
            "automatic renewal",
            "automatically renew",
            "auto-renew",
            "renewal term",
        ],
        "severity": 25,
        "explanation": "The contract may renew automatically without clear user approval."
    },
    {
        "title": "Hidden, unlimited, or unclear charges",
        "keywords": [
            "hidden fee",
            "additional fee",
            "additional fees",
            "processing fee",
            "service fee",
            "administrative fee",
            "unlimited charges",
            "charges that may be applied at any time",
            "fees may change",
            "payment terms may change",
        ],
        "severity": 35,
        "explanation": "The contract may allow unclear, changing, or unlimited charges."
    },
    {
        "title": "Unauthorized payment or withdrawal risk",
        "keywords": [
            "automatic withdrawals",
            "without notification",
            "without prior notice",
            "authorize automatic withdrawals",
            "new bank account",
            "bank account change",
            "wire transfer",
            "routing number",
            "swift code",
        ],
        "severity": 40,
        "explanation": "The contract may allow risky payment activity without enough user notice."
    },
    {
        "title": "Privacy or data misuse risk",
        "keywords": [
            "without consent",
            "personal financial data",
            "financial data without consent",
            "sold to third parties",
            "sell user data",
            "user data can be sold",
            "without restriction",
        ],
        "severity": 40,
        "explanation": "The contract may allow user data or financial data to be used without proper consent."
    },
    {
        "title": "No liability clause",
        "keywords": [
            "not liable",
            "under any circumstances",
            "not responsible for any damages",
            "no liability",
        ],
        "severity": 35,
        "explanation": "The contract may unfairly remove responsibility from the company."
    },
    {
        "title": "Legal rights waiver",
        "keywords": [
            "forfeits all rights",
            "waive legal action",
            "waive certain rights",
            "all disputes must be resolved solely in favor of the company",
            "solely in favor of the company",
        ],
        "severity": 45,
        "explanation": "The contract may unfairly limit the user's legal rights."
    },
    {
        "title": "Non-refundable or upfront payment",
        "keywords": [
            "non-refundable",
            "upfront payment",
            "advance payment",
            "payment in advance",
            "prepaid",
        ],
        "severity": 20,
        "explanation": "Large upfront or non-refundable payments increase financial risk."
    },
    {
        "title": "Vague service description",
        "keywords": [
            "miscellaneous services",
            "general consulting",
            "as requested",
            "other services",
            "undefined service",
            "unspecified conditions",
        ],
        "severity": 20,
        "explanation": "Vague service language makes it hard to verify what the vendor must deliver."
    },
    {
        "title": "One-sided termination terms",
        "keywords": [
            "vendor may terminate",
            "company may not terminate",
            "termination penalty",
            "no cancellation",
            "modify the terms at any time",
            "modify the terms",
        ],
        "severity": 30,
        "explanation": "The contract may unfairly give one side too much control."
    }
]

    for check in checks:
        matched_terms = []

        for keyword in check["keywords"]:
            if keyword in text:
                matched_terms.append(keyword)

        if matched_terms:
            risk_factors.append({
                "title": check["title"],
                "matched_terms": matched_terms,
                "explanation": check["explanation"]
            })
            score += check["severity"]

    score = min(score, 100)

    if score >= 60:
        verdict = "Red Flag"
        risk_level = "High"
        recommendation = "Do not approve this contract until legal, finance, or procurement reviews it."
    elif score >= 25:
        verdict = "Needs Approval"
        risk_level = "Medium"
        recommendation = "Ask a manager, legal, or procurement team member to review the flagged clauses."
    else:
        verdict = "Approved"
        risk_level = "Low"
        recommendation = "No major fraud or fairness risks were detected."

    if risk_factors:
        summary = f"{len(risk_factors)} potential contract risk factor(s) were detected."
    else:
        summary = "No major fraud or fairness indicators were found."

    return {
        "verdict": verdict,
        "risk_score": score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "summary": summary,
        "recommendation": recommendation
    }