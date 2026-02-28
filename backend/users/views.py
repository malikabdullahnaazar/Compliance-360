from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import CustomUser
from .permissions import IsSuperAdmin, IsSuperAdminOrAgencyAdmin
from .serializers import UserSerializer, RegisterSerializer

User = get_user_model()


class CustomTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, write_only=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError({'email': 'This field is required.', 'password': 'This field is required.'})

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({'email': 'No user found with this email address.'})
        except User.MultipleObjectsReturned:
            raise serializers.ValidationError({'email': 'Multiple users found with this email address.'})

        if not user.check_password(password):
            raise serializers.ValidationError({'password': 'Invalid password.'})

        if not user.is_active:
            raise serializers.ValidationError({'email': 'User account is disabled.'})

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }
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


# User Views
class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminOrAgencyAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'role', 'agency']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'agency__name']
    ordering_fields = ['date_joined', 'username', 'email', 'role']

    def get_queryset(self):
        qs = CustomUser.objects.all().select_related('agency').order_by('-date_joined')
        user = self.request.user
        if getattr(user, 'role', None) == 'superadmin':
            return qs
        elif getattr(user, 'role', None) == 'agency_admin':
            return qs.filter(agency=user.agency)
        return qs.none()


class UserCreateView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminOrAgencyAdmin]

    def create(self, request, *args, **kwargs):
        user = request.user
        data = dict(request.data)
        
        if getattr(user, 'role', None) == 'agency_admin':
            data['agency'] = user.agency_id
            
            # Extract first element from lists since dict(QueryDict) creates lists
            role = data.get('role', [''])[0] if isinstance(data.get('role'), list) else data.get('role')
            if role not in ['qa_compliance', 'clinician']:
                return Response({'detail': 'Agency admins can only create QA/Compliance Officers and Clinicians.'}, status=status.HTTP_403_FORBIDDEN)
                
        # Handle dict from QueryDict issue
        for key, value in data.items():
            if isinstance(value, list) and len(value) == 1:
                data[key] = value[0]
                
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        password = data.get('password') or None  # Treat '' as None
        if not password:
            # Generate a random password for the user if not provided
            import random
            import string
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        
        # Pass password to serializer save method which will handle hashing
        if getattr(user, 'role', None) == 'agency_admin':
            created_user = serializer.save(password=password, agency=user.agency)
        else:
            created_user = serializer.save(password=password)
        
        # TODO: Send email with password to user
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminOrAgencyAdmin]

    def get_queryset(self):
        qs = CustomUser.objects.all()
        user = self.request.user
        if getattr(user, 'role', None) == 'superadmin':
            return qs
        elif getattr(user, 'role', None) == 'agency_admin':
            return qs.filter(agency=user.agency)
        return qs.none()
        
    def perform_update(self, serializer):
        user = self.request.user
        if getattr(user, 'role', None) == 'agency_admin':
            role = serializer.validated_data.get('role', self.get_object().role)
            if role not in ['qa_compliance', 'clinician']:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Agency admins can only manage QA/Compliance Officers and Clinicians.")
            serializer.save(agency=user.agency)
        else:
            serializer.save()


class UserToggleStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminOrAgencyAdmin]

    def patch(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        request_user = request.user
        if getattr(request_user, 'role', None) == 'agency_admin':
            if user.agency != request_user.agency:
                return Response({'detail': 'Not authorized to modify this user.'}, status=status.HTTP_403_FORBIDDEN)
            if user.role not in ['qa_compliance', 'clinician']:
                return Response({'detail': 'Can only modify QA/Compliance and Clinician users.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Don't allow deactivating superadmin
        if user.role == 'superadmin':
            return Response({'detail': 'Cannot deactivate superadmin users.'}, status=status.HTTP_400_BAD_REQUEST)
        
        is_active = request.data.get('is_active')
        if is_active is not None:
            user.is_active = is_active
            user.save()
            serializer = UserSerializer(user)
            return Response(serializer.data)
        
        return Response({'detail': 'is_active field is required.'}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)

