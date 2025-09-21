#!/bin/bash

# Secure File Vault - Docker Build Script
# This script builds and runs the updated Docker containers with all recent changes

set -e

echo "🚀 Building Secure File Vault with Docker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down --remove-orphans

# Remove old images to force rebuild
print_status "Removing old images..."
docker-compose down --rmi all --remove-orphans 2>/dev/null || true

# Build and start services
print_status "Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check service health
print_status "Checking service health..."

# Check PostgreSQL
if docker-compose exec postgres pg_isready -U filevault > /dev/null 2>&1; then
    print_success "PostgreSQL is ready"
else
    print_warning "PostgreSQL might not be ready yet"
fi

# Check Backend
if curl -s http://localhost:8081/api/auth/validate > /dev/null 2>&1; then
    print_success "Backend is ready on port 8081"
else
    print_warning "Backend might not be ready yet"
fi

# Check Frontend
if curl -s http://localhost:3031 > /dev/null 2>&1; then
    print_success "Frontend is ready on port 3031"
else
    print_warning "Frontend might not be ready yet"
fi

# Check Nginx
if curl -s http://localhost > /dev/null 2>&1; then
    print_success "Nginx is ready on port 80"
else
    print_warning "Nginx might not be ready yet"
fi

echo ""
print_success "Docker build completed!"
echo ""
echo "🌐 Services are available at:"
echo "   Frontend: http://localhost:3031"
echo "   Backend API: http://localhost:8081"
echo "   Nginx (with SSL): http://localhost"
echo ""
echo "📊 To view logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 To stop services:"
echo "   docker-compose down"
echo ""
echo "🔄 To restart services:"
echo "   docker-compose restart"
echo ""

# Show running containers
print_status "Running containers:"
docker-compose ps
