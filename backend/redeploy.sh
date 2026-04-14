#!/bin/bash
# Compliance 360 Backend - Quick Redeploy Script
# Usage: ./redeploy.sh
# This script applies configuration changes and restarts the application

set -e

echo "=========================================="
echo "Compliance 360 - Backend Redeploy"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root or with sudo"
    exit 1
fi

# Navigate to backend directory
cd /root/Compliance-360/backend

# Check virtual environment
if [ ! -d "venv" ]; then
    print_error "Virtual environment not found"
    exit 1
fi

# Step 1: Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Step 2: Install dependencies
print_status "Installing dependencies..."
pip install -r requirements.txt

# Step 3: Run database migrations
print_status "Running database migrations..."
python manage.py migrate --noinput

# Step 4: Collect static files
print_status "Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || python manage.py collectstatic --noinput

# Step 5: Restart application service
print_status "Restarting application service..."
systemctl restart compliance360

# Step 6: Wait for service to start
print_status "Waiting for service to start..."
sleep 3

# Step 7: Verify service is running
if systemctl is-active --quiet compliance360; then
    print_status "✓ Compliance 360 service is running"
else
    print_error "✗ Compliance 360 service failed to start"
    journalctl -u compliance360 -n 10 --no-pager
    exit 1
fi

# Step 8: Test API endpoint
print_status "Testing API endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/admin/login/ || echo "000")
if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "302" ]; then
    print_status "✓ API is responding (HTTP $HTTP_STATUS)"
else
    print_status "API returned HTTP $HTTP_STATUS"
fi

echo ""
echo "=========================================="
echo "Redeploy Complete!"
echo "=========================================="
echo ""
echo "Backend URL: http://187.124.209.234:8000/"
echo "Admin Panel: http://187.124.209.234:8000/admin/"
echo ""
echo "View logs: journalctl -u compliance360 -f"
echo ""
