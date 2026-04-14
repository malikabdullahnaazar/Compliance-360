# Compliance 360 - Production Deployment Guide

## Overview

This Django backend is configured for professional production deployment with:

- **Database**: PostgreSQL 16
- **Application Server**: Uvicorn (ASGI) with 4 workers
- **Reverse Proxy**: Nginx
- **Static Files**: WhiteNoise (with Nginx optimization)
- **Media Files**: Nginx direct serving
- **Process Management**: systemd

## Quick Start

### 1. Deploy Everything

```bash
cd /root/Compliance-360/backend
sudo ./deploy.sh
```

This single command will:
- Install/update dependencies
- Run database migrations
- Collect static files
- Restart all services
- Verify everything is working

### 2. Access the Application

- **Local**: http://127.0.0.1
- **Network**: http://<server-ip>
- **Port 80**: Nginx (external access)
- **Port 8000**: Uvicorn (internal only, blocked by firewall)

## Architecture

```
┌─────────────────┐
│     Client      │
│   (Browser)     │
└────────┬────────┘
         │
         │ HTTP (Port 80)
         ▼
┌─────────────────┐
│      Nginx      │  ← Reverse Proxy
│  (Static/Media) │  ← Serves files directly
└────────┬────────┘
         │
         │ Proxy Pass
         ▼
┌─────────────────┐
│    Uvicorn      │  ← ASGI Server (4 workers)
│   (Django ASGI) │  ← Port 8000 (internal)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │  ← Database (Port 5432)
│   compliance360 │
└─────────────────┘
```

## Configuration Files

### Environment Variables (.env)

```bash
# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=compliance360
DB_USER=compliance_user
DB_PASSWORD=CompliancePass2024!
DB_HOST=localhost
DB_PORT=5432

# Security
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,yourdomain.com

# Static/Media
STATIC_URL=/static/
STATIC_ROOT=/root/Compliance-360/backend/staticfiles
MEDIA_URL=/media/
MEDIA_ROOT=/root/Compliance-360/backend/media
```

### Nginx Configuration

Location: `/etc/nginx/sites-available/compliance360`

Key features:
- Serves static files directly (bypasses Django)
- Serves media files directly
- Proxy passes everything else to Uvicorn
- 100MB upload limit
- Security headers

### Systemd Service

Location: `/etc/systemd/system/compliance360.service`

Configuration:
- 4 Uvicorn workers
- Auto-restart on failure
- Starts after PostgreSQL
- Runs on 0.0.0.0:8000

## File Upload Handling

### Large File Support

The system is configured to handle large files (up to 100MB):

1. **Nginx**: `client_max_body_size 100M;`
2. **Django Settings**:
   - `DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600` (100MB)
   - `FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600` (100MB)

### Media Files

Uploaded files are stored in:
- Path: `/root/Compliance-360/backend/media/`
- URL: `/media/`
- Served directly by Nginx (not Django)

## Management Commands

### View Application Logs

```bash
# Real-time logs
journalctl -u compliance360 -f

# Recent logs
journalctl -u compliance360 --since "1 hour ago"
```

### Restart Services

```bash
# Restart Django app
sudo systemctl restart compliance360

# Restart Nginx
sudo systemctl restart nginx

# Restart both
sudo systemctl restart compliance360 nginx
```

### Check Status

```bash
# Service status
sudo systemctl status compliance360
sudo systemctl status nginx
sudo systemctl status postgresql

# Test Nginx config
sudo nginx -t
```

### Database Management

```bash
cd /root/Compliance-360/backend
source venv/bin/activate

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Django shell
python manage.py shell
```

## Adding a Custom Domain

1. **Edit Nginx config**:
   ```bash
   sudo nano /etc/nginx/sites-available/compliance360
   ```

2. **Change server_name**:
   ```nginx
   server_name yourdomain.com www.yourdomain.com;
   ```

3. **Update ALLOWED_HOSTS in .env**:
   ```bash
   ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,yourdomain.com,www.yourdomain.com
   ```

4. **Reload services**:
   ```bash
   sudo systemctl reload nginx
   sudo systemctl restart compliance360
   ```

5. **Configure DNS**: Point your domain to the server IP

## SSL/HTTPS Setup (Let's Encrypt)

Once you have a domain:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
journalctl -u compliance360 -n 50 --no-pager

# Check for errors
sudo systemctl status compliance360
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
sudo -u postgres psql -d compliance360 -c "\dt"
```

### Static Files Not Loading

```bash
# Re-collect static files
cd /root/Compliance-360/backend
source venv/bin/activate
python manage.py collectstatic --noinput --clear

# Check permissions
ls -la /root/Compliance-360/backend/staticfiles/

# Restart services
sudo systemctl restart compliance360 nginx
```

### Port Already in Use

```bash
# Find process using port 8000
sudo lsof -i :8000

# Kill process if needed
sudo kill -9 <PID>
```

## Security Considerations

1. **Firewall**: Only ports 80/443 should be exposed
2. **Secret Key**: Change `SECRET_KEY` in production
3. **Database Password**: Use strong password (already set)
4. **File Uploads**: Limited to 100MB
5. **Allowed Hosts**: Restrict to your domain when ready

## Performance Tuning

### Uvicorn Workers

Edit `/etc/systemd/system/compliance360.service`:

```ini
# For 2 CPU cores, use 4 workers (2 x 2)
ExecStart=/root/Compliance-360/backend/venv/bin/uvicorn core.asgi:application \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4
```

Formula: `2 x $(nproc) + 1`

### Database Connections

PostgreSQL default allows 100 connections. For high traffic, tune:

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/16/main/postgresql.conf

# Increase max connections if needed
max_connections = 200
```

## Backup Strategy

### Database Backup

```bash
# Backup
sudo -u postgres pg_dump compliance360 > backup.sql

# Restore
sudo -u postgres psql compliance360 < backup.sql
```

### Media Files Backup

```bash
# Backup media files
tar -czf media-backup.tar.gz /root/Compliance-360/backend/media/

# Restore
tar -xzf media-backup.tar.gz -C /
```

## Support

For issues or questions, check:
- Application logs: `journalctl -u compliance360 -f`
- Nginx logs: `/var/log/nginx/error.log`
- Django logs: `/root/Compliance-360/backend/logs/django.log`
