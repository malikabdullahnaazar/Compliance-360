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
)

router = DefaultRouter()
router.register(r'audit-sessions', AuditSessionViewSet, basename='audit-session')
router.register(r'findings', ComplianceFindingViewSet, basename='finding')
router.register(r'documents', DocumentManagementViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
    # Direct AI analysis endpoints (without saving)
    path('analyze/', AIAuditAPIView.as_view({'post': 'analyze_documents'}), name='ai-analyze'),
    path('analyze-single/', AIAuditAPIView.as_view({'post': 'analyze_single_document'}), name='ai-analyze-single'),
    path('extract-analyze/', AIAuditAPIView.as_view({'post': 'extract_and_analyze'}), name='ai-extract-analyze'),
    # Mistral endpoints
    path('mistral/analyze/', MistralAnalyzeView.as_view({'post': 'analyze'}), name='mistral-analyze'),
    path('mistral/save/', MistralAnalyzeView.as_view({'post': 'save_result'}), name='mistral-save'),
    path('mistral/results/', MistralAnalyzeView.as_view({'get': 'list_results'}), name='mistral-results'),
]
