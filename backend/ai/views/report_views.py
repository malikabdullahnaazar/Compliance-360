import logging
import re
from datetime import datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import AuditDocument, AIAnalysisResult, AssignedAuditReport
from ..services.langchain_service import get_compliance_service

logger = logging.getLogger(__name__)

class ReportAnalyzeView(viewsets.ViewSet):
    """
    Endpoints for generating and managing compliance reports.
    (Formerly MistralAnalyzeView, now unified via LangChain)
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='analyze')
    def analyze(self, request):
        """Generates a Markdown compliance report for selected documents."""
        from patients.models import Patient

        patient_id = request.data.get('patient_id')
        document_ids = request.data.get('document_ids', [])

        if not patient_id or not document_ids:
            return Response({'error': 'patient_id and document_ids are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            patient = Patient.objects.get(id=patient_id)
            documents_qs = AuditDocument.objects.filter(id__in=document_ids, patient=patient)
            
            if not documents_qs.exists():
                return Response({'error': 'No matching documents found'}, status=status.HTTP_400_BAD_REQUEST)

            patient_info = {'patient_id': str(patient.id), 'first_name': patient.first_name, 'last_name': patient.last_name}
            documents_data = [
                {
                    'filename': doc.filename,
                    'document_type': doc.document_type,
                    'document_type_display': doc.get_document_type_display(),
                    'extracted_text': doc.extracted_text or '[No text extracted]',
                    'file_size_mb': float(doc.file_size_mb or 0),
                } for doc in documents_qs
            ]

            service = get_compliance_service()
            result = service.analyze_documents(documents=documents_data, patient_info=patient_info)
            
            # --- Build the Detailed Markdown Report (Frontend Compatibility) ---
            summary = result.get('audit_summary', {})
            score = summary.get('overall_compliance_score', 0)
            risk = summary.get('risk_level', 'UNKNOWN')
            text = summary.get('summary_text', 'No summary provided.')
            
            findings = result.get('findings', [])
            f_summary = result.get('metadata', {}).get('findings_summary', {})
            critical = f_summary.get('critical', 0)
            high = f_summary.get('high', 0)
            medium = f_summary.get('medium', 0)
            low = f_summary.get('low', 0)
            
            report_md_lines = [
                f"# Compliance Audit Report",
                f"\n## Executive Summary",
                f"**Compliance Score**: {score}/100",
                f"**Total Findings**: {len(findings)} | **Critical**: {critical} | **High**: {high} | **Medium**: {medium} | **Low**: {low}",
                f"**Overall Risk Level**: {risk}",
                f"\n{text}",
                f"\n## Compliance Findings",
            ]
            
            if not findings:
                report_md_lines.append("\n✅ No compliance findings identified in the analyzed documents.")
            else:
                for idx, f in enumerate(findings, 1):
                    sev_emoji = "❌" if f.get('severity') in ['CRITICAL', 'HIGH'] else "⚠️"
                    report_md_lines.extend([
                        f"\n### {idx}. {f.get('finding_title', 'Finding')}",
                        f"**Status**: {sev_emoji} {f.get('status', 'FAIL').upper()}",
                        f"**Severity**: {f.get('severity', 'MEDIUM')}",
                        f"**Category**: {f.get('category', 'D')} - {f.get('document_type', 'Unknown Document')}",
                        f"\n**Description**: {f.get('finding_description', '')}",
                        f"\n**Evidence**: ",
                        f"> {f.get('evidence_from_document', 'No evidence provided.')}",
                    ])
                    
                    loc = f.get('location_in_document', {})
                    if loc:
                        report_md_lines.append(f"\n**Location**: Page {loc.get('page_number', 'N/A')}, Section: {loc.get('section', 'N/A')}")
                    
                    citations = f.get('regulatory_citations', [])
                    if citations:
                        report_md_lines.append("\n**Regulatory Citations**:")
                        for c in citations:
                            report_md_lines.append(f"- **{c.get('framework', 'CMS')} {c.get('citation', '')}**: {c.get('description', '')}")
                    
                    guidance = f.get('correction_guidance', {})
                    if guidance:
                        report_md_lines.append("\n**Correction Guidance**:")
                        report_md_lines.append(f"- **Action**: {guidance.get('immediate_action', '')}")
                        report_md_lines.append(f"- **Responsible**: {guidance.get('responsible_party', '')} | **Timeline**: {guidance.get('timeline', '')}")
            
            # Add Red Flags
            red_flags = result.get('red_flags', [])
            if red_flags:
                report_md_lines.append("\n## 🚩 Red Flags")
                for rf in red_flags:
                    report_md_lines.append(f"- **[{rf.get('priority', 'URGENT')}] {rf.get('flag_type', '')}**: {rf.get('description', '')}")
            
            # Add Recommendations
            recs = result.get('recommendations', [])
            if recs:
                report_md_lines.append("\n## Recommendations")
                for r in recs:
                    report_md_lines.append(f"{r.get('priority', 1)}. **{r.get('recommendation', '')}**")
                    report_md_lines.append(f"   *Expected Outcome*: {r.get('expected_outcome', '')}")
            
            report_markdown = "\n".join(report_md_lines)
            
            
            # Post-process: make document names clickable links.
            for doc in documents_qs:
                escaped = re.escape(doc.filename)
                link = f"[{doc.filename}](doc:{str(doc.id)})"
                report_markdown = re.sub(
                    rf'(?<!\[){escaped}(?!\])',
                    link,
                    report_markdown,
                )
            
            
            response = Response({
                'report_markdown': report_markdown,
                'patient_info': patient_info,
                'document_names': [d['filename'] for d in documents_data],
                'result_data': result,
                'ai_model_used': result.get('metadata', {}).get('model')
            }, status=status.HTTP_200_OK)
            
            
            return response

        except Exception as exc:
            logger.error(f'AI analysis failed: {exc}')
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='save')
    def save_result(self, request):
        """Saves an AIAnalysisResult record with agency."""
        from patients.models import Patient
        patient_id = request.data.get('patient_id')
        report_markdown = request.data.get('report_markdown', '').strip()
        document_names = request.data.get('document_names', [])

        try:
            patient = Patient.objects.get(id=patient_id)
            result = AIAnalysisResult.objects.create(
                patient=patient,
                created_by=request.user,
                agency=request.user.agency,  # Set agency from user
                analyzed_document_names=document_names,
                report_markdown=report_markdown,
                ai_model_used=request.data.get('ai_model_used', 'unknown'),
                status=request.data.get('status', 'Fail')
            )
            return Response({'id': str(result.id), 'message': 'Result saved successfully'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='results')
    def list_results(self, request):
        """
        GET /api/ai/mistral/results/?patient_id=<uuid>&page=<int>&page_size=<int>&search=<str>&status=<str>
        Returns all saved AI analysis results with pagination and optional filtering/search.
        Agency-scoped filtering applied.
        """
        from rest_framework.pagination import PageNumberPagination
        from django.db.models import Exists, OuterRef, Q

        patient_id = request.query_params.get('patient_id')
        search_query = request.query_params.get('search', '').strip()
        page_size_param = request.query_params.get('page_size')
        status_filter = request.query_params.get('status', '').strip()  # 'Pass' or 'Fail'
        
        user = request.user
        
        qs = AIAnalysisResult.objects.select_related('patient', 'created_by').annotate(
            is_assigned=Exists(AssignedAuditReport.objects.filter(analysis_result=OuterRef('pk')))
        )
        
        # Apply agency-level filtering
        if hasattr(user, 'role') and user.role == 'superadmin':
            # Superadmins can see all results
            pass
        elif user.agency:
            # All other users can only see results from their agency
            qs = qs.filter(agency=user.agency)
        else:
            # Users without agency see nothing
            qs = qs.none()

        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        # Filter by status (Pass or Fail)
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Server-side search by patient name
        if search_query:
            qs = qs.filter(
                Q(patient__first_name__icontains=search_query) |
                Q(patient__last_name__icontains=search_query)
            )

        qs = qs.order_by('-created_at')

        # Apply pagination
        paginator = PageNumberPagination()
        if page_size_param:
            try:
                paginator.page_size = int(page_size_param)
            except (ValueError, TypeError):
                pass
        else:
            paginator.page_size = 10

        page = paginator.paginate_queryset(qs, request)
        if page is None:
            return Response({'error': 'Invalid page number'}, status=status.HTTP_404_NOT_FOUND)

        data = []
        for r in page:
            # Fetch analyzed document records for frontend compatibility
            analyzed_docs = AuditDocument.objects.filter(
                patient=r.patient,
                filename__in=r.analyzed_document_names
            ).values('id', 'filename', 'document_type')
            
            # Check for clinician submitted document in related assignments
            clinician_assignment = AssignedAuditReport.objects.filter(analysis_result=r).first()
            clinician_doc_status = 'pending'
            clinician_assignment_id = None
            if clinician_assignment:
                clinician_assignment_id = str(clinician_assignment.id)
                if clinician_assignment.uploaded_document:
                    clinician_doc_status = 'submitted'

            data.append({
                'id': str(r.id),
                'patient_id': str(r.patient.id),
                'patient_name': f'{r.patient.first_name} {r.patient.last_name}',
                'status': r.status,
                'ai_model_used': r.ai_model_used,
                'report_markdown': r.report_markdown[:200] + '...', # snippet for list
                'created_at': r.created_at.isoformat(),
                'is_assigned': r.is_assigned,
                'analyzed_document_names': r.analyzed_document_names,
                'analyzed_documents': list(analyzed_docs),
                'clinician_document_status': clinician_doc_status,
                'clinician_assignment_id': clinician_assignment_id,
            })
            
        return paginator.get_paginated_response(data)

    @action(detail=False, methods=['get'], url_path='results/(?P<result_id>[^/.]+)/detail')
    def get_result_detail(self, request, result_id=None):
        """GET /api/ai/mistral/results/<result_id>/detail/"""
        from django.db.models import Exists, OuterRef
        try:
            r = AIAnalysisResult.objects.select_related('patient', 'created_by').annotate(
                is_assigned=Exists(AssignedAuditReport.objects.filter(analysis_result=OuterRef('pk')))
            ).get(pk=result_id)
        except AIAnalysisResult.DoesNotExist:
            return Response({'error': 'Result not found'}, status=status.HTTP_404_NOT_FOUND)

        analyzed_docs = AuditDocument.objects.filter(
            patient=r.patient,
            filename__in=r.analyzed_document_names
        ).values('id', 'filename', 'document_type', 'file_size_mb')
        
        analyzed_documents_info = [
            {
                'id': str(d['id']),
                'filename': d['filename'],
                'document_type': d['document_type'],
                'file_size_mb': round(d['file_size_mb'], 2),
            }
            for d in analyzed_docs
        ]

        assignment_with_doc = AssignedAuditReport.objects.filter(
            analysis_result=r,
            uploaded_document__isnull=False
        ).exclude(uploaded_document='').select_related('assigned_to').first()

        detail = {
            'id': str(r.id),
            'patient_name': f'{r.patient.first_name} {r.patient.last_name}',
            'report_markdown': r.report_markdown,
            'analyzed_documents': analyzed_documents_info,
            'ai_model_used': r.ai_model_used,
            'status': r.status,
            'created_at': r.created_at.isoformat(),
            'is_assigned': r.is_assigned,
        }
        
        if assignment_with_doc:
            detail.update({
                'has_clinician_document': True,
                'clinician_document_name': assignment_with_doc.uploaded_document_name,
                'clinician_name': assignment_with_doc.assigned_to.get_full_name()
            })
            
        return Response(detail)

    @action(detail=False, methods=['post'], url_path='results/(?P<result_id>[^/.]+)/submit_document')
    def submit_clinician_document(self, request, result_id=None):
        """POST /api/ai/mistral/results/<id>/submit_document/"""
        from django.utils import timezone
        try:
            r = AIAnalysisResult.objects.get(pk=result_id)
            uploaded_file = request.FILES.get('document')
            if not uploaded_file:
                return Response({'error': 'No file'}, status=status.HTTP_400_BAD_REQUEST)

            # Link it to the result or a related assignment
            return Response({'message': 'Submitted'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='results/(?P<result_id>[^/.]+)/clinician_document')
    def download_clinician_document(self, request, result_id=None):
        """GET /api/ai/mistral/results/<id>/clinician_document/"""
        from django.http import FileResponse
        try:
            r = AIAnalysisResult.objects.get(pk=result_id)
            # Find associated assignment with document
            a = AssignedAuditReport.objects.filter(analysis_result=r).exclude(uploaded_document='').first()
            if not a or not a.uploaded_document:
                return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
            return FileResponse(open(a.uploaded_document.path, 'rb'))
        except Exception:
            return Response({'error': 'Error'}, status=status.HTTP_404_NOT_FOUND)
    @action(detail=False, methods=['post'], url_path='results/(?P<result_id>[^/.]+)/mark_as_pass')
    def mark_as_pass(self, request, result_id=None):
        """
        POST /api/ai/mistral/results/<id>/mark_as_pass/
        Manually mark a 'Fail' report as 'Pass'.
        Only allows superadmins, agency admins, or QA/Compliance roles.
        """
        try:
            # Check permissions
            is_admin = request.user.role in ['superadmin', 'agency_admin']
            is_qa = request.user.role == 'qa_compliance'

            if not (is_admin or is_qa):
                return Response(
                    {'error': 'You do NOT have permission to manually pass reports.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            result = AIAnalysisResult.objects.get(pk=result_id)
            
            # Verify agency access
            if request.user.role != 'superadmin':
                if not result.agency or result.agency != request.user.agency:
                    return Response(
                        {'error': 'You do not have permission to access this report.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            if result.status == 'Pass':
                return Response({'message': 'Report is already marked as Passed.'}, status=status.HTTP_200_OK)

            result.status = 'Pass'
            result.save()

            logger.info(f"Report {result_id} manually marked as PASS by user {request.user.email}")
            return Response({'message': 'Report marked as Passed successfully.'}, status=status.HTTP_200_OK)

        except AIAnalysisResult.DoesNotExist:
            return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error marking report as Pass: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
