from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    LogoutView,
    MeView,
    RegisterView,
    UserListView,
    UserCreateView,
    UserDetailView,
    UserToggleStatusView,
)

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', MeView.as_view(), name='users_me'),
    path('auth/register/', RegisterView.as_view(), name='auth_register'),

    # User endpoints
    path('admin/users/', UserListView.as_view(), name='admin_users_list'),
    path('admin/users/create/', UserCreateView.as_view(), name='admin_users_create'),
    path('admin/users/<int:pk>/', UserDetailView.as_view(), name='admin_user_detail'),
    path('admin/users/<int:pk>/toggle-status/', UserToggleStatusView.as_view(), name='admin_user_toggle_status'),
]

