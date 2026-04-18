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

# Redis (Celery message broker)
if ! dpkg -l redis-server 2>/dev/null | grep -q '^ii'; then
    print_status "Installing Redis server..."
    apt-get update -qq
    apt-get install -y redis-server
fi
if ! systemctl is-active --quiet redis-server; then
    print_status "Starting Redis..."
    systemctl enable --now redis-server
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

# Step 5: Celery worker unit
print_status "Installing Celery systemd unit..."
install -m 644 deploy/systemd/compliance360-celery.service /etc/systemd/system/compliance360-celery.service
systemctl daemon-reload
systemctl enable compliance360-celery

# Step 6: Restart application + Celery
print_status "Restarting application service..."
systemctl restart compliance360
print_status "Restarting Celery worker..."
systemctl restart compliance360-celery

# Step 7: Wait for service to start
print_status "Waiting for service to start..."
sleep 3

# Step 8: Verify services
if systemctl is-active --quiet compliance360; then
    print_status "✓ Compliance 360 service is running"
else
    print_error "✗ Compliance 360 service failed to start"
    journalctl -u compliance360 -n 10 --no-pager
    exit 1
fi

if systemctl is-active --quiet compliance360-celery; then
    print_status "✓ Celery worker (compliance360-celery) is running"
else
    print_error "✗ Celery worker failed to start — check: journalctl -u compliance360-celery -n 50 --no-pager"
    journalctl -u compliance360-celery -n 20 --no-pager || true
    exit 1
fi

# Step 9: Test API endpoint
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
echo "View API logs:    journalctl -u compliance360 -f"
echo "View Celery logs: journalctl -u compliance360-celery -f"
echo ""
