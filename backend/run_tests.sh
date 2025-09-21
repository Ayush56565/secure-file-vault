#!/bin/bash

# Backend Test Runner Script
set -e

echo "🧪 Running Backend Tests..."

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

# Check if Go is installed
if ! command -v go &> /dev/null; then
    print_error "Go is not installed. Please install Go and try again."
    exit 1
fi

# Download dependencies
print_status "Downloading test dependencies..."
go mod tidy

# Run tests with coverage
print_status "Running tests with coverage..."
go test -v -coverprofile=coverage.out ./...

# Check if tests passed
if [ $? -eq 0 ]; then
    print_success "All tests passed!"
    
    # Generate coverage report
    print_status "Generating coverage report..."
    go tool cover -html=coverage.out -o coverage.html
    
    print_success "Coverage report generated: coverage.html"
    
    # Show coverage summary
    print_status "Coverage summary:"
    go tool cover -func=coverage.out | tail -1
    
else
    print_error "Some tests failed!"
    exit 1
fi

echo ""
print_success "Backend testing completed!"
