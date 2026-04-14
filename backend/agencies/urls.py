from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgencyViewSet, AgencyAnalyticsViewSet

router = DefaultRouter()
router.register(r'agencies', AgencyViewSet, basename='agency')
router.register(r'analytics', AgencyAnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]