# Docker Setup Documentation

## Overview

The Secure File Vault application is fully containerized using Docker and Docker Compose, providing a consistent development and deployment environment across different platforms. The setup includes separate containers for the frontend, backend, database, and reverse proxy.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │    │   (Go)          │    │   (PostgreSQL)  │
│   Port: 3031    │    │   Port: 8081    │    │   Port: 5433    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Nginx         │
                    │   (Reverse      │
                    │    Proxy)       │
                    │   Port: 80      │
                    └─────────────────┘
```

## Prerequisites

### System Requirements

- **Docker**: Version 20.10+ 
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 4GB RAM
- **Storage**: Minimum 10GB free space
- **OS**: Linux, macOS, or Windows with WSL2

### Installation

**Ubuntu/Debian**:
```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install docker.io docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

**macOS**:
```bash
# Install Docker Desktop
brew install --cask docker

# Or download from: https://www.docker.com/products/docker-desktop
```

**Windows**:
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Enable WSL2 backend
# Install WSL2: wsl --install
```

### Verification

```bash
# Check Docker installation
docker --version
docker compose version

# Test Docker functionality
docker run hello-world
```

---

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd secure-file-vault
```

### 2. Environment Configuration

Create environment files for different environments:

**Development** (`.env.development`):
```bash
# Database
POSTGRES_DB=filevault_dev
POSTGRES_USER=filevault
POSTGRES_PASSWORD=dev_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=8081
BACKEND_HOST=0.0.0.0
BACKEND_ENV=development
BACKEND_LOG_LEVEL=debug

# Frontend
FRONTEND_PORT=3031
FRONTEND_HOST=0.0.0.0
VITE_API_BASE_URL=http://localhost:8081

# Nginx
NGINX_PORT=80
NGINX_HOST=0.0.0.0

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_SECOND=10
RATE_LIMIT_BURST_SIZE=20

# Storage
STORAGE_PATH=/app/uploads
MAX_FILE_SIZE_MB=100
```

**Production** (`.env.production`):
```bash
# Database
POSTGRES_DB=filevault_prod
POSTGRES_USER=filevault_prod
POSTGRES_PASSWORD=secure_production_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=8081
BACKEND_HOST=0.0.0.0
BACKEND_ENV=production
BACKEND_LOG_LEVEL=info

# Frontend
FRONTEND_PORT=3031
FRONTEND_HOST=0.0.0.0
VITE_API_BASE_URL=https://yourdomain.com/api

# Nginx
NGINX_PORT=80
NGINX_HOST=0.0.0.0

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_SECOND=5
RATE_LIMIT_BURST_SIZE=10

# Storage
STORAGE_PATH=/app/uploads
MAX_FILE_SIZE_MB=50
```

### 3. Build and Run

```bash
# Build all services
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

### 4. Access Application

- **Frontend**: http://localhost:3031
- **Backend API**: http://localhost:8081
- **Database**: localhost:5433
- **Nginx Proxy**: http://localhost:80

---

## Detailed Configuration

### Docker Compose Services

#### Frontend Service

**Configuration** (`docker-compose.yml`):
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  ports:
    - "${FRONTEND_PORT:-3031}:3031"
  environment:
    - VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:8081}
  volumes:
    - ./frontend:/app
    - /app/node_modules
  depends_on:
    - backend
  networks:
    - app-network
```

**Dockerfile** (`frontend/Dockerfile`):
```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3031
CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Configuration** (`frontend/nginx.conf`):
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 3031;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy
        location /api/ {
            proxy_pass http://backend:8081/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### Backend Service

**Configuration** (`docker-compose.yml`):
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  ports:
    - "${BACKEND_PORT:-8081}:8081"
  environment:
    - DB_HOST=${POSTGRES_HOST:-db}
    - DB_PORT=${POSTGRES_PORT:-5432}
    - DB_USER=${POSTGRES_USER:-filevault}
    - DB_PASSWORD=${POSTGRES_PASSWORD}
    - DB_NAME=${POSTGRES_DB:-filevault}
    - STORAGE_PATH=${STORAGE_PATH:-/app/uploads}
    - MAX_FILE_SIZE_MB=${MAX_FILE_SIZE_MB:-100}
    - RATE_LIMIT_REQUESTS_PER_SECOND=${RATE_LIMIT_REQUESTS_PER_SECOND:-10}
    - RATE_LIMIT_BURST_SIZE=${RATE_LIMIT_BURST_SIZE:-20}
  volumes:
    - uploads:/app/uploads
  depends_on:
    - db
  networks:
    - app-network
```

**Dockerfile** (`backend/Dockerfile`):
```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# Production stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/main .

# Copy migration files
COPY migrations/ ./migrations/

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8081

# Run the application
CMD ["./main"]
```

#### Database Service

**Configuration** (`docker-compose.yml`):
```yaml
db:
  image: postgres:15-alpine
  ports:
    - "${POSTGRES_PORT:-5433}:5432"
  environment:
    - POSTGRES_DB=${POSTGRES_DB:-filevault}
    - POSTGRES_USER=${POSTGRES_USER:-filevault}
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./backend/migrations:/docker-entrypoint-initdb.d
  networks:
    - app-network
```

**Volume Configuration**:
```yaml
volumes:
  postgres_data:
    driver: local
  uploads:
    driver: local
```

#### Nginx Proxy Service

**Configuration** (`docker-compose.yml`):
```yaml
nginx:
  image: nginx:alpine
  ports:
    - "${NGINX_PORT:-80}:80"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - uploads:/usr/share/nginx/html/uploads:ro
  depends_on:
    - frontend
    - backend
  networks:
    - app-network
```

**Nginx Configuration** (`nginx/nginx.conf`):
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

    # Upstream servers
    upstream frontend {
        server frontend:3031;
    }

    upstream backend {
        server backend:8081;
    }

    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # File upload settings
            client_max_body_size 100M;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # File uploads (stricter rate limiting)
        location /api/files/upload {
            limit_req zone=upload burst=5 nodelay;
            proxy_pass http://backend/api/files/upload;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            client_max_body_size 100M;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Static file serving
        location /uploads/ {
            alias /usr/share/nginx/html/uploads/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

---

## Development Workflow

### Local Development

#### Option 1: Full Docker Environment

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop services
docker compose down
```

#### Option 2: Hybrid Development

**Backend Only**:
```bash
# Start database
docker compose up -d db

# Run backend locally
cd backend
go run cmd/main.go
```

**Frontend Only**:
```bash
# Start backend and database
docker compose up -d backend db

# Run frontend locally
cd frontend
npm install
npm run dev
```

### Hot Reloading

**Frontend Development**:
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
```

**Backend Development**:
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  backend:
    volumes:
      - ./backend:/app
    command: go run cmd/main.go
```

### Database Management

**Access Database**:
```bash
# Connect to database container
docker compose exec db psql -U filevault -d filevault

# Run migrations
docker compose exec backend ./main migrate

# Backup database
docker compose exec db pg_dump -U filevault filevault > backup.sql

# Restore database
docker compose exec -T db psql -U filevault filevault < backup.sql
```

**Database Reset**:
```bash
# Stop services
docker compose down

# Remove volumes
docker compose down -v

# Restart services
docker compose up -d
```

---

## Production Deployment

### Environment Setup

**Production Environment Variables**:
```bash
# .env.production
POSTGRES_PASSWORD=your_secure_password
BACKEND_ENV=production
VITE_API_BASE_URL=https://yourdomain.com/api
RATE_LIMIT_REQUESTS_PER_SECOND=5
MAX_FILE_SIZE_MB=50
```

### SSL/TLS Configuration

**Nginx SSL Configuration** (`nginx/nginx-ssl.conf`):
```nginx
events {
    worker_connections 1024;
}

http {
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
        ssl_certificate_key /etc/ssl/private/yourdomain.com.key;

        # HSTS
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Rest of configuration...
    }
}
```

### Docker Compose Production

**Production Override** (`docker-compose.prod.yml`):
```yaml
version: '3.8'

services:
  frontend:
    restart: unless-stopped
    environment:
      - NODE_ENV=production

  backend:
    restart: unless-stopped
    environment:
      - BACKEND_ENV=production
      - LOG_LEVEL=info

  db:
    restart: unless-stopped
    environment:
      - POSTGRES_DB=filevault_prod
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data

  nginx:
    restart: unless-stopped
    volumes:
      - ./nginx/nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - /etc/ssl/certs:/etc/ssl/certs:ro
      - /etc/ssl/private:/etc/ssl/private:ro

volumes:
  postgres_prod_data:
    driver: local
```

### Deployment Commands

```bash
# Production deployment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Update application
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale backend=3
```

---

## Monitoring and Logging

### Log Management

**View Logs**:
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend

# Since specific time
docker compose logs --since="2023-01-01T00:00:00" backend
```

**Log Rotation**:
```yaml
# docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Health Checks

**Service Health Checks**:
```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U filevault"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Health Check Endpoint** (`backend/internal/handlers/health.go`):
```go
func HealthCheck(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "status": "healthy",
        "timestamp": time.Now(),
        "version": "1.0.0",
    })
}
```

### Performance Monitoring

**Resource Usage**:
```bash
# Container stats
docker stats

# Service resource usage
docker compose top

# Disk usage
docker system df
```

**Cleanup**:
```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Remove everything unused
docker system prune -a
```

---

## Troubleshooting

### Common Issues

#### 1. Port Conflicts

**Error**: `bind: address already in use`

**Solution**:
```bash
# Check what's using the port
sudo netstat -tulpn | grep :8081

# Kill the process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
```

#### 2. Database Connection Issues

**Error**: `connection refused`

**Solution**:
```bash
# Check database status
docker compose ps db

# Check database logs
docker compose logs db

# Restart database
docker compose restart db
```

#### 3. Permission Issues

**Error**: `permission denied`

**Solution**:
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

#### 4. Memory Issues

**Error**: `out of memory`

**Solution**:
```bash
# Increase Docker memory limit
# Docker Desktop: Settings > Resources > Memory

# Or optimize application
docker compose down
docker system prune -a
docker compose up -d
```

### Debugging Commands

**Container Inspection**:
```bash
# Inspect container
docker inspect <container_name>

# Execute commands in container
docker compose exec backend sh
docker compose exec db psql -U filevault -d filevault

# View container processes
docker compose exec backend ps aux
```

**Network Debugging**:
```bash
# Check network connectivity
docker compose exec backend ping db
docker compose exec frontend ping backend

# View network configuration
docker network ls
docker network inspect secure-file-vault_app-network
```

**Volume Debugging**:
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect secure-file-vault_postgres_data

# Mount volume for inspection
docker run --rm -v secure-file-vault_postgres_data:/data alpine ls -la /data
```

---

## Security Considerations

### Container Security

**Non-root User**:
```dockerfile
# backend/Dockerfile
FROM alpine:latest
RUN adduser -D -s /bin/sh appuser
USER appuser
```

**Security Scanning**:
```bash
# Scan images for vulnerabilities
docker scan secure-file-vault-backend
docker scan secure-file-vault-frontend
```

### Network Security

**Internal Networks**:
```yaml
networks:
  app-network:
    driver: bridge
    internal: false  # Allow external access
```

**Firewall Rules**:
```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5433/tcp  # Block direct database access
```

### Data Protection

**Volume Encryption**:
```yaml
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /encrypted/path
```

**Backup Encryption**:
```bash
# Encrypted backup
docker compose exec db pg_dump -U filevault filevault | gpg --symmetric --cipher-algo AES256 > backup.sql.gpg
```

---

## Backup and Recovery

### Automated Backups

**Backup Script** (`scripts/backup.sh`):
```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="filevault_backup_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
docker compose exec -T db pg_dump -U filevault filevault > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/$BACKUP_FILE.gz s3://your-backup-bucket/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "filevault_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Cron Job**:
```bash
# Add to crontab
0 2 * * * /path/to/scripts/backup.sh
```

### Recovery Procedures

**Database Recovery**:
```bash
# Stop services
docker compose down

# Restore database
docker compose up -d db
docker compose exec -T db psql -U filevault filevault < backup.sql

# Start all services
docker compose up -d
```

**Full System Recovery**:
```bash
# Clone repository
git clone <repository-url>
cd secure-file-vault

# Restore environment
cp .env.production .env

# Restore volumes
docker volume create secure-file-vault_postgres_data
docker run --rm -v secure-file-vault_postgres_data:/data -v $(pwd)/backup:/backup alpine sh -c "cd /data && tar -xzf /backup/postgres_data.tar.gz"

# Start services
docker compose up -d
```

---

## Scaling and Performance

### Horizontal Scaling

**Load Balancer Configuration**:
```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  backend:
    deploy:
      replicas: 3
    environment:
      - BACKEND_PORT=8081

  nginx:
    volumes:
      - ./nginx/nginx-lb.conf:/etc/nginx/nginx.conf:ro
```

**Nginx Load Balancer** (`nginx/nginx-lb.conf`):
```nginx
upstream backend {
    server backend_1:8081;
    server backend_2:8081;
    server backend_3:8081;
}

server {
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Performance Optimization

**Resource Limits**:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

**Database Optimization**:
```yaml
db:
  environment:
    - POSTGRES_SHARED_BUFFERS=256MB
    - POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
    - POSTGRES_MAINTENANCE_WORK_MEM=64MB
```

---

## Maintenance

### Regular Maintenance Tasks

**Weekly Tasks**:
```bash
# Update images
docker compose pull

# Restart services
docker compose restart

# Clean up
docker system prune -f
```

**Monthly Tasks**:
```bash
# Security updates
docker compose pull
docker compose up -d

# Backup verification
docker compose exec db psql -U filevault -d filevault -c "SELECT COUNT(*) FROM users;"

# Performance review
docker stats --no-stream
```

### Update Procedures

**Application Updates**:
```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker compose build --no-cache

# Update services
docker compose up -d

# Verify deployment
docker compose ps
docker compose logs -f
```

**Database Migrations**:
```bash
# Run migrations
docker compose exec backend ./main migrate

# Verify migration
docker compose exec db psql -U filevault -d filevault -c "\dt"
```

---

## Best Practices

### Development

1. **Use .env files** for environment-specific configuration
2. **Implement health checks** for all services
3. **Use multi-stage builds** for optimized images
4. **Implement proper logging** with structured formats
5. **Use volumes** for persistent data

### Production

1. **Use specific image tags** instead of `latest`
2. **Implement resource limits** to prevent resource exhaustion
3. **Use secrets management** for sensitive data
4. **Implement monitoring** and alerting
5. **Regular security updates** and vulnerability scanning

### Security

1. **Run containers as non-root** users
2. **Use minimal base images** (Alpine Linux)
3. **Implement network segmentation**
4. **Regular security scanning** of images
5. **Secure secrets management**

### Performance

1. **Use connection pooling** for database connections
2. **Implement caching** strategies
3. **Optimize image layers** for faster builds
4. **Monitor resource usage** regularly
5. **Implement horizontal scaling** when needed
