# 🐳 Docker Deployment Guide

This guide covers deploying the Secure File Vault application using Docker with all recent updates and improvements.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB of available RAM
- Ports 80, 3031, 8081, and 5433 available

### One-Command Deployment
```bash
./build-docker.sh
```

This script will:
- Stop existing containers
- Remove old images
- Build fresh containers with all updates
- Start all services
- Verify health status

## 📋 Manual Deployment

### 1. Environment Configuration
Create a `.env` file (optional, defaults are provided):
```bash
# Database Configuration
POSTGRES_PASSWORD=filevault123
POSTGRES_PORT=5433

# Backend Configuration
BACKEND_PORT=8081
JWT_SECRET=your-secret-key-change-in-production
RATE_LIMIT_RPS=10
DEFAULT_QUOTA_MB=10
GIN_MODE=release

# Frontend Configuration
FRONTEND_PORT=3031
REACT_APP_API_URL=http://localhost:8081

# Nginx Configuration
NGINX_PORT=80
NGINX_SSL_PORT=443
```

### 2. Build and Start Services
```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Verify Deployment
```bash
# Check backend health
curl http://localhost:8081/api/auth/validate

# Check frontend
curl http://localhost:3031

# Check nginx
curl http://localhost
```

## 🏗️ Architecture Overview

### Services
- **PostgreSQL** (Port 5433): Database with persistent storage
- **Backend** (Port 8081): Go API server with all recent updates
- **Frontend** (Port 3031): React application with modern UI
- **Nginx** (Port 80/443): Reverse proxy and load balancer

### Recent Updates Included
- ✅ **Public File Downloads**: Fixed 404 errors for public file access
- ✅ **Deduplication Analytics**: Corrected space savings calculations
- ✅ **Rate Limiting**: Increased from 2 to 10 requests per second
- ✅ **Modern UI**: Updated with shadcn/ui components
- ✅ **Pagination**: Added to all file and folder lists
- ✅ **File Previews**: Enhanced image and PDF preview support
- ✅ **Download Fixes**: Centralized download functionality
- ✅ **Port Configuration**: Frontend on 3031, Backend on 8081

## 🔧 Configuration Details

### Backend Configuration
- **Port**: 8081 (updated from 8080)
- **Rate Limiting**: 10 requests/second (increased from 2)
- **Storage Quota**: 10MB per user (configurable)
- **File Upload**: 100MB max file size
- **WebSocket**: Real-time updates enabled

### Frontend Configuration
- **Port**: 3031 (updated from 3000)
- **API URL**: http://localhost:8081
- **Modern UI**: shadcn/ui components
- **Pagination**: 5 items per page
- **File Previews**: Images and PDFs supported

### Database Configuration
- **PostgreSQL 15**: Latest stable version
- **Port**: 5433 (external), 5432 (internal)
- **Persistent Storage**: Data survives container restarts
- **Health Checks**: Automatic restart on failure

## 🛠️ Management Commands

### Service Management
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f [service_name]

# Rebuild specific service
docker-compose up --build -d [service_name]
```

### Database Management
```bash
# Access database
docker-compose exec postgres psql -U filevault -d filevault

# Backup database
docker-compose exec postgres pg_dump -U filevault filevault > backup.sql

# Restore database
docker-compose exec -T postgres psql -U filevault -d filevault < backup.sql
```

### File Management
```bash
# Access uploads directory
docker-compose exec backend ls -la /app/uploads

# Copy files to/from container
docker cp container_name:/app/uploads ./local_uploads
```

## 🔍 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :8081
netstat -tulpn | grep :3031

# Kill processes using ports
sudo fuser -k 8081/tcp
sudo fuser -k 3031/tcp
```

#### Service Not Starting
```bash
# Check logs
docker-compose logs [service_name]

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart [service_name]
```

#### Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres pg_isready -U filevault
```

### Health Checks
```bash
# Backend health
curl http://localhost:8081/api/auth/validate

# Frontend health
curl http://localhost:3031

# Database health
docker-compose exec postgres pg_isready -U filevault
```

## 📊 Monitoring

### Resource Usage
```bash
# View resource usage
docker stats

# View container details
docker-compose ps
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## 🔒 Security Considerations

### Production Deployment
1. **Change default passwords** in `.env` file
2. **Use strong JWT secrets** (32+ characters)
3. **Enable HTTPS** by configuring SSL certificates
4. **Set up firewall rules** to restrict access
5. **Regular security updates** for base images

### SSL Configuration
To enable HTTPS, uncomment and configure the SSL section in `nginx/nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of SSL configuration
}
```

## 🚀 Production Deployment

### Environment Variables
```bash
# Production .env
POSTGRES_PASSWORD=your-strong-password
JWT_SECRET=your-very-long-random-secret-key
GIN_MODE=release
NODE_ENV=production
```

### Resource Limits
Add resource limits to `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### Backup Strategy
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U filevault filevault > "backup_$DATE.sql"
```

## 📈 Performance Optimization

### Database Tuning
- Increase `shared_buffers` for PostgreSQL
- Configure `work_mem` based on available RAM
- Set up connection pooling

### Nginx Optimization
- Enable gzip compression
- Configure caching headers
- Set up rate limiting

### Application Tuning
- Adjust rate limiting based on usage
- Configure file upload limits
- Optimize database queries

## 🆘 Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify service health: `docker-compose ps`
3. Check resource usage: `docker stats`
4. Review this documentation

## 📝 Changelog

### Recent Updates (Latest)
- **Port Configuration**: Updated to use 3031 (frontend) and 8081 (backend)
- **Public Downloads**: Fixed 404 errors for public file access
- **Deduplication Stats**: Corrected space savings calculations
- **Rate Limiting**: Increased from 2 to 10 requests per second
- **Modern UI**: Updated with shadcn/ui components
- **Pagination**: Added to all file and folder lists
- **File Previews**: Enhanced image and PDF preview support
- **Download Fixes**: Centralized download functionality across all components
