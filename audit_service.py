import re
from typing import List, Pattern


def _normalize_text(contract_text: str) -> str:
    text = contract_text.lower()
    text = re.sub(r"[^a-z0-9$%\.\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _compile(patterns: List[str]) -> List[Pattern]:
    return [re.compile(pattern, re.IGNORECASE) for pattern in patterns]


RISK_CHECKS = [

    {
        "title": "Unilateral control / unfair modification",
        "patterns": _compile([
            r"\b(reserves?|retain[s]?)\s+(?:the\s+)?right\s+to\b",
            r"\b(?:we|company|service|provider)\s+(?:may|can)\b",
        ]),
        "severity": 20,
        "explanation": "The company may have unilateral control over terms or actions.",
    },

    {
        "title": "Changes without notice",
        "patterns": _compile([
            r"\bat\s+any\s+time\b",
            r"\bwithout\s+(?:notice|consent|approval)\b",
        ]),
        "severity": 20,
        "explanation": "The company can act without informing the user.",
    },

    {
        "title": "Automatic renewal clause",
        "patterns": _compile([
            r"\bauto(?:matic(?:ally)?|-)?\s*renew(?:al|s|ed)?\b",
            r"\brenew(?:s|ed)?\s+(?:automatically|without\s+(?:notice|approval))\b",
        ]),
        "severity": 25,
        "explanation": "The contract may renew automatically without user awareness.",
    },

    {
        "title": "Unclear or variable charges",
        "patterns": _compile([
            r"\bfees?\s+(?:may\s+)?(?:change|vary|increase)\b",
            r"\badditional\s+charges?\b",
            r"\bhidden\s+fees?\b",
        ]),
        "severity": 25,
        "explanation": "Charges may be unclear or change unexpectedly.",
    },

    {
        "title": "Data sharing with third parties",
        "patterns": _compile([
            r"\bshare\s+(?:your\s+)?data\s+with\s+(?:third\s+part(?:y|ies))\b",
            r"\bdata\s+may\s+be\s+shared\b",
        ]),
        "severity": 20,
        "explanation": "Your data may be shared with third parties.",
    },
]


def run_contract_audit(contract_text: str):
    text = _normalize_text(contract_text)

    risk_factors = []
    score = 0

    matched_flags = set()

    for check in RISK_CHECKS:
        matched_terms = []

        for pattern in check["patterns"]:
            match = pattern.search(text)
            if match:
                matched_terms.append(match.group(0))

        if matched_terms:
            matched_flags.add(check["title"])

            risk_factors.append({
                "title": check["title"],
                "matched_terms": list(set(matched_terms)),
                "explanation": check["explanation"],
            })

            score += check["severity"]

    if (
        "Unilateral control / unfair modification" in matched_flags
        and "Changes without notice" in matched_flags
    ):
        score += 20 

    score = min(score, 100)

    if score < 30:
        risk_level = "low"
    elif score < 60:
        risk_level = "medium"
    else:
        risk_level = "high"

    return {
        "risk_level": risk_level,
        "risk_score": score,
        "risk_factors": risk_factors,
    }