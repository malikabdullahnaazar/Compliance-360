from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    AgencyListCreateView,
    CustomTokenObtainPairView,
    LogoutView,
    MeView,
    RegisterView,
    UserListView,
)

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', MeView.as_view(), name='users_me'),
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('admin/agencies/', AgencyListCreateView.as_view(), name='admin_agencies'),
    path('admin/users/', UserListView.as_view(), name='admin_users'),
]
