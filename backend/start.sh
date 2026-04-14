#!/bin/bash
# Quick start script for development/testing
# For production, use deploy.sh with systemd

cd /root/Compliance-360/backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Please create it first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Create necessary directories
mkdir -p static media logs

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

echo "Starting Uvicorn server on 0.0.0.0:8000..."
echo "Press Ctrl+C to stop"
echo ""

# Start Uvicorn with auto-reload for development
exec uvicorn core.asgi:application \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --reload-dir . \
    --log-level info
