"""Build compliance report markdown from structured AI result (shared by API and tasks)."""

import re
from typing import Any, Dict


def build_compliance_report_markdown(
    result: Dict[str, Any],
    documents_qs,
) -> str:
    """Mirror of ReportAnalyzeView markdown assembly + doc: link post-process."""
    summary = result.get("audit_summary", {})
    score = summary.get("overall_compliance_score", 0)
    risk = summary.get("risk_level", "UNKNOWN")
    text = summary.get("summary_text", "No summary provided.")

    findings = result.get("findings", [])
    f_summary = result.get("metadata", {}).get("findings_summary", {})
    critical = f_summary.get("critical", 0)
    high = f_summary.get("high", 0)
    medium = f_summary.get("medium", 0)
    low = f_summary.get("low", 0)

    report_md_lines = [
        "# Compliance Audit Report",
        "\n## Executive Summary",
        f"**Compliance Score**: {score}/100",
        f"**Total Findings**: {len(findings)} | **Critical**: {critical} | **High**: {high} "
        f"| **Medium**: {medium} | **Low**: {low}",
        f"**Overall Risk Level**: {risk}",
        f"\n{text}",
        "\n## Compliance Findings",
    ]

    if not findings:
        report_md_lines.append(
            "\n✅ No compliance findings identified in the analyzed documents."
        )
    else:
        for idx, f in enumerate(findings, 1):
            sev_emoji = "❌" if f.get("severity") in ["CRITICAL", "HIGH"] else "⚠️"
            report_md_lines.extend(
                [
                    f"\n### {idx}. {f.get('finding_title', 'Finding')}",
                    f"**Status**: {sev_emoji} {f.get('status', 'FAIL').upper()}",
                    f"**Severity**: {f.get('severity', 'MEDIUM')}",
                    f"**Category**: {f.get('category', 'D')} - {f.get('document_type', 'Unknown Document')}",
                    f"\n**Description**: {f.get('finding_description', '')}",
                    "\n**Evidence**: ",
                    f"> {f.get('evidence_from_document', 'No evidence provided.')}",
                ]
            )

            loc = f.get("location_in_document", {})
            if loc:
                report_md_lines.append(
                    f"\n**Location**: Page {loc.get('page_number', 'N/A')}, "
                    f"Section: {loc.get('section', 'N/A')}"
                )

            citations = f.get("regulatory_citations", [])
            if citations:
                report_md_lines.append("\n**Regulatory Citations**:")
                for c in citations:
                    report_md_lines.append(
                        f"- **{c.get('framework', 'CMS')} {c.get('citation', '')}**: "
                        f"{c.get('description', '')}"
                    )

            guidance = f.get("correction_guidance", {})
            if guidance:
                report_md_lines.append("\n**Correction Guidance**:")
                report_md_lines.append(f"- **Action**: {guidance.get('immediate_action', '')}")
                report_md_lines.append(
                    f"- **Responsible**: {guidance.get('responsible_party', '')} | "
                    f"**Timeline**: {guidance.get('timeline', '')}"
                )

    red_flags = result.get("red_flags", [])
    if red_flags:
        report_md_lines.append("\n## 🚩 Red Flags")
        for rf in red_flags:
            report_md_lines.append(
                f"- **[{rf.get('priority', 'URGENT')}] {rf.get('flag_type', '')}**: "
                f"{rf.get('description', '')}"
            )

    recs = result.get("recommendations", [])
    if recs:
        report_md_lines.append("\n## Recommendations")
        for r in recs:
            rec_text = r.get("recommendation") or r.get("text") or ""
            report_md_lines.append(f"{r.get('priority', 1)}. **{rec_text}**")
            report_md_lines.append(f"   *Expected Outcome*: {r.get('expected_outcome', '')}")

    report_markdown = "\n".join(report_md_lines)

    for doc in documents_qs:
        escaped = re.escape(doc.filename)
        link = f"[{doc.filename}](doc:{str(doc.id)})"
        report_markdown = re.sub(
            rf"(?<!\[){escaped}(?!\])",
            link,
            report_markdown,
        )

    return report_markdown
