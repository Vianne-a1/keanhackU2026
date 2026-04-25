document.addEventListener("DOMContentLoaded", () => {
    console.log("JS loaded");

    const button = document.getElementById("runAudit");
    const input = document.getElementById("contractText");
    const output = document.getElementById("auditResult");

    if (!button) {
        console.log("Button NOT found ❌");
        return;
    }

    if (!input) {
        console.log("Textarea NOT found ❌");
        return;
    }

    if (!output) {
        console.log("Result area NOT found ❌");
        return;
    }

    console.log("Button found ✅");

    button.addEventListener("click", async () => {
        console.log("BUTTON CLICKED");

        const contractText = input.value.trim();

        if (!contractText) {
            output.innerHTML = "<p>Please enter contract text.</p>";
            return;
        }

        button.disabled = true;
        output.innerHTML = "<p>Loading...</p>";

        try {
            const res = await fetch("http://localhost:8000/api/contracts/audit-text", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contract_text: contractText,
                }),
            });

            const data = await res.json();
            console.log("API result:", data);

            if (!res.ok) {
                throw new Error(data.detail || "Backend request failed");
            }

            const factors = data.risk_factors || [];

            output.innerHTML = `
                <span class="tag ${data.risk_level === "high" ? "red-flag" : data.risk_level === "medium" ? "warning" : "safe"}">
                    ${data.verdict || data.risk_level || "Result"}
                </span>

                <strong>Audit Result</strong>

                <p><strong>Risk Level:</strong> ${data.risk_level || "N/A"}</p>
                <p><strong>Risk Score:</strong> ${data.risk_score ?? "N/A"}</p>

                ${data.summary ? `<p>${data.summary}</p>` : ""}

                <ul>
                    ${factors.map(item => `
                        <li>
                            <strong>${item.title}</strong><br>
                            ${item.explanation || ""}<br>
                            <small>Matched: ${(item.matched_terms || []).join(", ") || "None"}</small>
                        </li>
                    `).join("")}
                </ul>

                ${data.recommendation ? `<p><strong>Recommendation:</strong> ${data.recommendation}</p>` : ""}
            `;
        } catch (err) {
            console.error(err);
            output.innerHTML = "<p>Something went wrong. Check backend / console.</p>";
        } finally {
            button.disabled = false;
        }
    });
});