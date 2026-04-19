"""
AI App URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuditSessionViewSet,
    ComplianceFindingViewSet,
    AIAuditAPIView,
    DocumentManagementViewSet,
    MistralAnalyzeView,
    AssignedAuditReportView,
)

router = DefaultRouter()
router.register(r'audit-sessions', AuditSessionViewSet, basename='audit-session')
router.register(r'findings', ComplianceFindingViewSet, basename='finding')
router.register(r'documents', DocumentManagementViewSet, basename='document')
router.register(r'mistral/assignments', AssignedAuditReportView, basename='mistral-assignments')

urlpatterns = [
    path('', include(router.urls)),
    # Direct AI analysis endpoints (without saving)
    path('analyze/', AIAuditAPIView.as_view({'post': 'analyze_documents'}), name='ai-analyze'),
    path('analyze-single/', AIAuditAPIView.as_view({'post': 'analyze_single_document'}), name='ai-analyze-single'),
    path('extract-analyze/', AIAuditAPIView.as_view({'post': 'extract_and_analyze'}), name='ai-extract-analyze'),
    # Mistral endpoints
    path('mistral/analyze/', MistralAnalyzeView.as_view({'post': 'analyze'}), name='mistral-analyze'),
    path(
        'mistral/jobs/<uuid:job_id>/status/',
        MistralAnalyzeView.as_view({'get': 'job_status'}),
        name='mistral-job-status',
    ),
    path('mistral/save/', MistralAnalyzeView.as_view({'post': 'save_result'}), name='mistral-save'),
    path('mistral/results/', MistralAnalyzeView.as_view({'get': 'list_results'}), name='mistral-results'),
    path('mistral/results/<str:result_id>/detail/', MistralAnalyzeView.as_view({'get': 'get_result_detail'}), name='mistral-result-detail'),
    path('mistral/results/<str:result_id>/submit_document/', MistralAnalyzeView.as_view({'post': 'submit_clinician_document'}), name='mistral-submit-clinician-doc'),
    path('mistral/results/<str:result_id>/clinician_document/', MistralAnalyzeView.as_view({'get': 'download_clinician_document'}), name='mistral-download-clinician-doc'),
    path('mistral/results/<str:result_id>/mark_as_pass/', MistralAnalyzeView.as_view({'post': 'mark_as_pass'}), name='mistral-mark-as-pass'),
    # Assignment endpoints
    path('mistral/assign/', AssignedAuditReportView.as_view({'post': 'assign'}), name='mistral-assign'),
    path('mistral/assigned/', AssignedAuditReportView.as_view({'get': 'list_assigned'}), name='mistral-list-assigned'),
    path('mistral/assigned/<pk>/detail/', AssignedAuditReportView.as_view({'get': 'get_detail'}), name='mistral-assignment-detail'),
    path('mistral/assigned/<pk>/upload_document/', AssignedAuditReportView.as_view({'post': 'upload_document'}), name='mistral-upload-doc'),
    path('mistral/assigned/<pk>/download_document/', AssignedAuditReportView.as_view({'get': 'download_document'}), name='mistral-download-doc'),
    path(
        'mistral/assigned/<pk>/analyzed_documents/<doc_id>/download/',
        AssignedAuditReportView.as_view({'get': 'download_analyzed_source'}),
        name='mistral-assignment-analyzed-download',
    ),
    path('mistral/clinicians/', AssignedAuditReportView.as_view({'get': 'list_clinicians'}), name='mistral-clinicians'),
]
