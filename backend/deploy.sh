#!/bin/bash
# Compliance 360 Production Deployment Script
# This script sets up and deploys the Django backend with PostgreSQL, Uvicorn, and Nginx

set -e  # Exit on error

echo "=========================================="
echo "Compliance 360 - Production Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
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

# Step 1: Check virtual environment
print_status "Checking virtual environment..."
if [ ! -d "venv" ]; then
    print_error "Virtual environment not found. Please run: python3.11 -m venv venv"
    exit 1
fi

# Step 2: Activate virtual environment and install dependencies
print_status "Installing/updating dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Step 3: Run database migrations
print_status "Running database migrations..."
python manage.py migrate --noinput

# Step 4: Collect static files
print_status "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Step 5: Create necessary directories
print_status "Creating media and logs directories..."
mkdir -p media logs
chmod 755 media logs

# Step 5b: Redis + Celery worker (async tasks)
print_status "Installing Redis server (if missing)..."
apt-get update -qq
apt-get install -y redis-server
systemctl enable --now redis-server

print_status "Installing Celery systemd unit..."
install -m 644 deploy/systemd/compliance360-celery.service /etc/systemd/system/compliance360-celery.service
systemctl daemon-reload
systemctl enable compliance360-celery

# Step 6: Reload systemd and restart services
print_status "Reloading systemd daemon..."
systemctl daemon-reload

# Step 7: Test Nginx configuration
print_status "Testing Nginx configuration..."
if nginx -t; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Step 8: Restart services
print_status "Restarting services..."
systemctl restart compliance360
systemctl restart compliance360-celery
systemctl restart nginx

# Step 9: Enable services to start on boot
print_status "Enabling services to start on boot..."
systemctl enable compliance360
systemctl enable compliance360-celery
systemctl enable nginx
systemctl enable postgresql
systemctl enable redis-server

# Step 10: Check service status
print_status "Checking service status..."
sleep 2

if systemctl is-active --quiet compliance360; then
    print_status "✓ Compliance 360 service is running"
else
    print_error "✗ Compliance 360 service failed to start"
    systemctl status compliance360 --no-pager
    exit 1
fi

if systemctl is-active --quiet compliance360-celery; then
    print_status "✓ Celery worker (compliance360-celery) is running"
else
    print_error "✗ Celery worker failed to start"
    systemctl status compliance360-celery --no-pager
    exit 1
fi

if systemctl is-active --quiet nginx; then
    print_status "✓ Nginx service is running"
else
    print_error "✗ Nginx service failed to start"
    systemctl status nginx --no-pager
    exit 1
fi

if systemctl is-active --quiet postgresql; then
    print_status "✓ PostgreSQL service is running"
else
    print_error "✗ PostgreSQL service is not running"
    exit 1
fi

# Step 11: Display deployment info
echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Application URL: http://$(hostname -I | awk '{print $1}')"
echo "Local URL:       http://127.0.0.1"
echo "Backend Port:    8000 (internal)"
echo "Nginx Port:      80 (external)"
echo ""
echo "Useful commands:"
echo "  - View API logs:    journalctl -u compliance360 -f"
echo "  - View Celery logs: journalctl -u compliance360-celery -f"
echo "  - Restart app:      systemctl restart compliance360"
echo "  - Restart Celery:   systemctl restart compliance360-celery"
echo "  - Check status:     systemctl status compliance360"
echo "  - Nginx logs:    tail -f /var/log/nginx/access.log"
echo ""
echo "To add a domain later:"
echo "  1. Edit: /etc/nginx/sites-available/compliance360"
echo "  2. Change: server_name _; to server_name yourdomain.com;"
echo "  3. Reload: systemctl reload nginx"
echo ""
print_status "Deployment successful!"
