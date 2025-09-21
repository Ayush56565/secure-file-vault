# Secure File Vault

A modern, secure file storage and sharing platform built with Go and React. Features content-based deduplication, hierarchical organization, real-time collaboration, and comprehensive admin capabilities.

## 🌐 Live Deployment

**🚀 [Frontend Application](https://secure-file-vault-frontend.onrender.com)** - React-based user interface  
**⚙️ [Backend API](https://secure-file-vault-backend-6wqo.onrender.com/health)** - Go REST API server

> **Note**: The application is deployed on Render's free tier, which may experience cold starts. Please allow a few moments for the services to initialize on first access.

## 🚀 Features

### Core Functionality
- **Secure File Storage**: Upload and store files with encryption and deduplication
- **User Management**: Registration, authentication, and role-based authorization
- **File Sharing**: Share files with specific users or make them publicly accessible
- **Folder Organization**: Hierarchical folder structure with nested organization
- **Content Deduplication**: Automatic storage optimization using SHA-256 hashing
- **Real-time Updates**: WebSocket-based live notifications and updates

### Advanced Features
- **Admin Dashboard**: Comprehensive system management and analytics
- **Rate Limiting**: API protection with configurable limits
- **Storage Quotas**: Per-user storage limits with enforcement
- **File Preview**: Built-in preview for images and PDFs
- **Search & Filter**: Advanced file search with multiple criteria
- **Tagging System**: Flexible file categorization and organization
- **Public Files**: Global file sharing with download tracking
- **Analytics**: Detailed usage statistics and deduplication metrics

### User Experience
- **Responsive Design**: Modern UI built with shadcn/ui and Tailwind CSS
- **Progressive Web App**: Offline capabilities and mobile optimization
- **Drag & Drop**: Intuitive file upload interface
- **Bulk Operations**: Multi-file upload and management
- **Keyboard Shortcuts**: Power-user productivity features

## 🛠 Tech Stack

### Backend
- **Go 1.21**: High-performance server language
- **Gin**: Lightweight web framework with middleware support
- **PostgreSQL 15**: Robust relational database with advanced features
- **JWT**: Stateless authentication with role-based access control
- **WebSocket**: Real-time bidirectional communication
- **Docker**: Containerized deployment and scaling

### Frontend
- **React 18**: Modern component-based UI with hooks and context
- **TypeScript**: Type-safe development with comprehensive interfaces
- **Vite**: Lightning-fast build tool and development server
- **Tailwind CSS**: Utility-first styling with design system
- **shadcn/ui**: Accessible component library with Radix UI primitives
- **React Query**: Powerful server state management and caching
- **React Router**: Declarative routing with protected routes
- **React Hook Form**: Performant forms with validation
- **Axios**: HTTP client with interceptors and error handling
- **Sonner**: Beautiful toast notifications

### Infrastructure
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy with load balancing and SSL termination
- **PostgreSQL**: Primary data store with ACID compliance
- **File System**: Local storage with organized directory structure

## 🚀 Quick Start

### Prerequisites
- **Docker**: Version 20.10+ with Compose v2
- **Memory**: Minimum 4GB RAM
- **Storage**: Minimum 10GB free space
- **OS**: Linux, macOS, or Windows with WSL2

### Option 1: Docker Compose (Recommended)

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd secure-file-vault
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   docker compose up -d
   ```

4. **Access the application**
   - **Frontend**: http://localhost:3031
   - **Backend API**: http://localhost:8081
   - **Database**: localhost:5433

### Option 2: Manual Setup

1. **Database setup**
   ```bash
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib
   
   # Create database
   sudo -u postgres createdb filevault
   sudo -u postgres createuser filevault
   sudo -u postgres psql -c "ALTER USER filevault PASSWORD 'password';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE filevault TO filevault;"
   ```

2. **Backend setup**
   ```bash
   cd backend
   go mod download
   go run cmd/main.go migrate
   go run cmd/main.go
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📚 Documentation

### Comprehensive Guides
- **[Docker Setup](docs/DOCKER_SETUP.md)**: Complete containerization guide
- **[Database Schema](docs/DATABASE_SCHEMA.md)**: Detailed database design and optimization
- **[API Documentation](docs/API.md)**: Complete API reference with examples
- **[Architecture](docs/ARCHITECTURE.md)**: System design and scalability patterns

### API Reference
- **[OpenAPI Specification](docs/openapi.yaml)**: Machine-readable API documentation
- **Interactive Docs**: Available at `/api/docs` when running the backend

## 🏗 Project Structure

```
secure-file-vault/
├── 📁 backend/                    # Go backend application
│   ├── 📁 cmd/                    # Application entry points
│   ├── 📁 internal/               # Private application code
│   │   ├── 📁 handlers/           # HTTP request handlers
│   │   ├── 📁 middleware/         # HTTP middleware (auth, rate limiting)
│   │   ├── 📁 models/             # Data models and DTOs
│   │   ├── 📁 services/           # Business logic layer
│   │   └── 📁 utils/              # Utility functions
│   ├── 📁 migrations/             # Database schema migrations
│   ├── 📁 test/                   # Test files and mocks
│   ├── 📄 Dockerfile             # Backend container definition
│   └── 📄 go.mod                 # Go module dependencies
├── 📁 frontend/                   # React frontend application
│   ├── 📁 src/                    # Source code
│   │   ├── 📁 components/         # Reusable UI components
│   │   ├── 📁 pages/              # Page components and routes
│   │   ├── 📁 services/           # API service layer
│   │   ├── 📁 contexts/           # React context providers
│   │   ├── 📁 hooks/              # Custom React hooks
│   │   ├── 📁 utils/              # Utility functions
│   │   └── 📁 types/              # TypeScript type definitions
│   ├── 📁 public/                 # Static assets
│   ├── 📄 Dockerfile             # Frontend container definition
│   ├── 📄 nginx.conf             # Nginx configuration
│   └── 📄 package.json           # Node.js dependencies
├── 📁 docs/                       # Documentation
│   ├── 📄 API.md                 # API documentation
│   ├── 📄 ARCHITECTURE.md        # System architecture
│   ├── 📄 DATABASE_SCHEMA.md     # Database design
│   ├── 📄 DOCKER_SETUP.md        # Docker setup guide
│   └── 📄 openapi.yaml           # OpenAPI specification
├── 📁 nginx/                      # Nginx configuration
├── 📁 scripts/                    # Deployment and utility scripts
├── 📄 docker-compose.yml         # Multi-container orchestration
├── 📄 .env.example               # Environment configuration template
└── 📄 README.md                  # This file
```

## 🔧 Configuration

### Environment Variables

**Backend Configuration**:
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=filevault
DB_PASSWORD=password
DB_NAME=filevault

# Server
BACKEND_PORT=8081
BACKEND_HOST=0.0.0.0
BACKEND_ENV=development

# Storage
STORAGE_PATH=./uploads
MAX_FILE_SIZE_MB=100

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_SECOND=10
RATE_LIMIT_BURST_SIZE=20
```

**Frontend Configuration**:
```bash
# API
VITE_API_BASE_URL=http://localhost:8081

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_REAL_TIME=true
```

### Docker Configuration

**Development**:
```bash
docker compose up -d
```

**Production**:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
go test ./...
go test -v ./internal/handlers/test/
go test -v ./internal/services/test/
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
```

### Integration Tests
```bash
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   cp .env.example .env.production
   # Configure production values
   ```

2. **SSL Configuration**
   ```bash
   # Generate SSL certificates
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
   ```

3. **Deploy with Docker**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

4. **Health Check**
   ```bash
   curl http://localhost/health
   ```

### Scaling

**Horizontal Scaling**:
```bash
# Scale backend services
docker compose up -d --scale backend=3

# Add load balancer
docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

## 📊 Monitoring

### Health Checks
- **Backend**: `GET /health`
- **Database**: Connection and query performance
- **Storage**: Disk usage and file system health

### Metrics
- **Application**: Request rates, response times, error rates
- **System**: CPU, memory, disk usage
- **Database**: Query performance, connection pool status

### Logging
- **Structured Logs**: JSON format with correlation IDs
- **Log Levels**: Debug, Info, Warn, Error
- **Log Rotation**: Automatic cleanup and archival

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with expiration
- **Role-Based Access**: User and admin role separation
- **Password Security**: bcrypt hashing with salt

### Data Protection
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Token-based request validation

### File Security
- **Content Deduplication**: SHA-256 content hashing
- **Access Control**: Per-file and per-folder permissions
- **Secure Upload**: File type validation and size limits
- **Encrypted Storage**: Optional file encryption

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Follow coding standards and add tests
4. **Run tests**: Ensure all tests pass
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push branch**: `git push origin feature/amazing-feature`
7. **Open Pull Request**: Provide detailed description

### Coding Standards

**Backend (Go)**:
- Follow Go conventions and idioms
- Use `gofmt` and `golint`
- Write comprehensive tests
- Document public APIs

**Frontend (React/TypeScript)**:
- Use TypeScript strict mode
- Follow React best practices
- Use ESLint and Prettier
- Write component tests

### Testing Requirements
- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: Critical user flows
- **E2E Tests**: Complete user journeys
- **Performance Tests**: Load and stress testing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@filevault.com for enterprise support

### Community
- **GitHub**: [Repository](https://github.com/your-org/secure-file-vault)
- **Discord**: [Community Server](https://discord.gg/filevault)
- **Twitter**: [@FileVaultApp](https://twitter.com/FileVaultApp)

## 🗺 Roadmap

### Short Term (3-6 months)
- [ ] Performance optimization and caching
- [ ] Enhanced security features
- [ ] Comprehensive monitoring
- [ ] Mobile responsive improvements

### Medium Term (6-12 months)
- [ ] Microservices architecture
- [ ] Native mobile applications
- [ ] Real-time collaboration features
- [ ] Advanced search capabilities

### Long Term (12+ months)
- [ ] AI-powered file organization
- [ ] Multi-region deployment
- [ ] Enterprise features and compliance
- [ ] Advanced analytics and insights

---

**Built with ❤️ by the Secure File Vault team**