from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Agency, CustomUser
from .permissions import IsSuperAdmin
from .serializers import AgencySerializer, UserSerializer, RegisterSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class AgencyListCreateView(generics.ListCreateAPIView):
    queryset = Agency.objects.all().order_by('-created_at')
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]


class UserListView(generics.ListAPIView):
    queryset = CustomUser.objects.all().select_related('agency').order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
