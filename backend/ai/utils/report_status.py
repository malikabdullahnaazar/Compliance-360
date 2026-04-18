"""
Derive Pass/Fail from generated report markdown (same rules as the legacy frontend).
"""

import re
from typing import Literal

ReportStatus = Literal["Pass", "Fail"]


def report_status_from_markdown(report_markdown: str) -> ReportStatus:
    """Return Pass or Fail based on executive summary heuristics."""
    text = report_markdown or ""
    status: ReportStatus = "Fail"

    findings_match = re.search(r"Total\s+Findings\D*(\d+)", text, re.IGNORECASE)
    if findings_match:
        total_findings = int(findings_match.group(1), 10)
        return "Pass" if total_findings == 0 else "Fail"

    score_match = re.search(
        r"Compliance\s+Score\s*:\s*(\d+)\s*/\s*100", text, re.IGNORECASE
    )
    if score_match:
        score = int(score_match.group(1), 10)
        return "Pass" if score >= 85 else "Fail"

    risk_match = re.search(
        r"Overall\s+Risk\s+Level\s*:.*?(CRITICAL|HIGH|MEDIUM|LOW|NONE)",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if risk_match:
        risk_level = risk_match.group(1).upper()
        return "Pass" if risk_level in ("LOW", "NONE") else "Fail"

    fail_line = re.search(
        r"^[-*]\s.*?(?:❌\s*FAIL|status:\s*❌)", text, re.IGNORECASE | re.MULTILINE
    )
    return "Fail" if fail_line else "Pass"
