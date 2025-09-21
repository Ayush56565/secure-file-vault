# Architecture Documentation

## Overview

The Secure File Vault is a modern, cloud-native file storage and sharing platform built with a microservices architecture. It provides secure file storage, content-based deduplication, hierarchical organization, and comprehensive sharing capabilities with role-based access control.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser (React SPA)  │  Mobile App  │  API Clients         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Nginx Reverse Proxy  │  Load Balancer  │  CDN (Optional)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Service     │  Backend API     │  Admin Dashboard     │
│  (React + Vite)       │  (Go + Gin)      │  (React Components)  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Business Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Authentication  │  File Management  │  Sharing  │  Analytics   │
│  Authorization   │  Deduplication   │  Folders  │  Monitoring  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL      │  File Storage    │  Redis Cache  │  Logs     │
│  (Metadata)      │  (File System)   │  (Optional)   │  (JSON)   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
User Request → Nginx → Frontend/Backend → Business Logic → Database
     ↓              ↓           ↓              ↓            ↓
   Browser ← HTML/CSS ← React ← API ← Services ← PostgreSQL
```

---

## Technology Stack

### Frontend Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | React 18 | Component-based UI |
| **Build Tool** | Vite | Fast development and build |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Pre-built accessible components |
| **State Management** | React Query | Server state management |
| **Routing** | React Router | Client-side routing |
| **Forms** | React Hook Form | Form handling and validation |
| **HTTP Client** | Axios | API communication |
| **Notifications** | Sonner | Toast notifications |

### Backend Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Language** | Go 1.21 | High-performance server language |
| **Framework** | Gin | Lightweight web framework |
| **Database** | PostgreSQL 15 | Relational database |
| **ORM** | Native SQL | Direct database queries |
| **Authentication** | JWT | Stateless authentication |
| **File Storage** | Local Filesystem | File content storage |
| **Logging** | Structured Logging | JSON-formatted logs |
| **Testing** | Testify + SQLMock | Unit and integration testing |

### Infrastructure Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Containerization** | Docker | Application packaging |
| **Orchestration** | Docker Compose | Multi-container management |
| **Reverse Proxy** | Nginx | Load balancing and SSL termination |
| **Database** | PostgreSQL | Data persistence |
| **Monitoring** | Docker Stats | Resource monitoring |
| **Backup** | pg_dump | Database backup |

---

## Design Patterns

### 1. Layered Architecture

The application follows a clean layered architecture pattern:

```
┌─────────────────────────────────────┐
│           Presentation Layer        │  ← React Components, UI
├─────────────────────────────────────┤
│           Application Layer         │  ← Business Logic, Services
├─────────────────────────────────────┤
│           Domain Layer              │  ← Models, Entities
├─────────────────────────────────────┤
│           Infrastructure Layer      │  ← Database, File System
└─────────────────────────────────────┘
```

**Benefits**:
- Separation of concerns
- Testability
- Maintainability
- Scalability

### 2. Repository Pattern

**Implementation**:
```go
type UserRepository interface {
    Create(user *models.User) error
    GetByID(id int) (*models.User, error)
    GetByUsername(username string) (*models.User, error)
    Update(user *models.User) error
    Delete(id int) error
}

type userRepository struct {
    db *sql.DB
}

func (r *userRepository) Create(user *models.User) error {
    // Implementation
}
```

**Benefits**:
- Data access abstraction
- Testability with mocks
- Database independence

### 3. Service Layer Pattern

**Implementation**:
```go
type UserService struct {
    userRepo UserRepository
    authRepo AuthRepository
}

func (s *UserService) CreateUser(req *CreateUserRequest) (*UserResponse, error) {
    // Business logic
    // Validation
    // Repository calls
    // Response mapping
}
```

**Benefits**:
- Business logic encapsulation
- Transaction management
- Cross-cutting concerns

### 4. Dependency Injection

**Implementation**:
```go
func NewUserService(userRepo UserRepository, authRepo AuthRepository) *UserService {
    return &UserService{
        userRepo: userRepo,
        authRepo: authRepo,
    }
}

func NewAuthHandler(userService *UserService) *AuthHandler {
    return &AuthHandler{
        userService: userService,
    }
}
```

**Benefits**:
- Loose coupling
- Testability
- Configuration flexibility

---

## Data Architecture

### Database Design

#### Normalization Strategy

The database follows 3rd Normal Form (3NF) with strategic denormalization for performance:

**Normalized Tables**:
- `users` - User accounts and metadata
- `file_hashes` - Content deduplication
- `files` - File metadata and references
- `folders` - Hierarchical organization
- `file_shares` - User-specific sharing
- `folder_shares` - Folder sharing
- `file_tags` - File categorization

**Denormalized Fields**:
- `download_count` in files table (for performance)
- `username` in file queries (for display)

#### Content-Based Deduplication

**Strategy**:
```
File Upload → SHA-256 Hash → Check Existing → Store/Reference
```

**Implementation**:
```sql
-- Check for existing content
SELECT id FROM file_hashes WHERE hash_sha256 = $1;

-- If exists, create file reference
INSERT INTO files (user_id, hash_id, original_name, ...) 
VALUES ($1, $2, $3, ...);

-- If new, store content and create hash
INSERT INTO file_hashes (hash_sha256, file_size, mime_type) 
VALUES ($1, $2, $3);
```

**Benefits**:
- Storage efficiency
- Bandwidth savings
- Faster uploads for duplicate content

### File Storage Architecture

#### Physical Storage

```
/uploads/
├── 2023/
│   ├── 01/
│   │   ├── hash1/
│   │   │   └── content.bin
│   │   └── hash2/
│   │       └── content.bin
│   └── 02/
│       └── hash3/
│           └── content.bin
└── metadata/
    └── file_metadata.json
```

#### Storage Optimization

**Directory Structure**:
- Date-based partitioning
- Hash-based subdirectories
- Metadata separation

**Benefits**:
- Efficient file system usage
- Easy backup and archival
- Reduced directory traversal

---

## Security Architecture

### Authentication & Authorization

#### JWT-Based Authentication

**Token Structure**:
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": 123,
    "username": "john_doe",
    "is_admin": false,
    "exp": 1640995200,
    "iat": 1640908800
  }
}
```

**Implementation**:
```go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := extractToken(c)
        claims, err := validateToken(token)
        if err != nil {
            c.JSON(401, gin.H{"error": "Unauthorized"})
            c.Abort()
            return
        }
        c.Set("user_id", claims.UserID)
        c.Set("is_admin", claims.IsAdmin)
        c.Next()
    }
}
```

#### Role-Based Access Control (RBAC)

**Roles**:
- **User**: Standard file operations
- **Admin**: System management, user management, analytics

**Permissions**:
```go
type Permission string

const (
    PermissionReadFile    Permission = "read:file"
    PermissionWriteFile   Permission = "write:file"
    PermissionDeleteFile Permission = "delete:file"
    PermissionShareFile  Permission = "share:file"
    PermissionAdmin     Permission = "admin:*"
)
```

### Data Protection

#### Encryption Strategy

**At Rest**:
- Database encryption (PostgreSQL TDE)
- File system encryption
- Backup encryption

**In Transit**:
- HTTPS/TLS 1.3
- API authentication
- Secure headers

**Implementation**:
```go
func EncryptFile(content []byte, key []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    
    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }
    
    return gcm.Seal(nonce, nonce, content, nil), nil
}
```

### Input Validation

#### Request Validation

**Frontend**:
```typescript
const schema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  email: z.string().email(),
});

const result = schema.parse(formData);
```

**Backend**:
```go
type CreateUserRequest struct {
    Username string `json:"username" binding:"required,min=3,max=50"`
    Password string `json:"password" binding:"required,min=8"`
    Email    string `json:"email" binding:"required,email"`
}
```

#### SQL Injection Prevention

**Parameterized Queries**:
```go
query := "SELECT * FROM users WHERE username = $1 AND password_hash = $2"
row := db.QueryRow(query, username, passwordHash)
```

**Benefits**:
- Automatic escaping
- Type safety
- Performance optimization

---

## Performance Architecture

### Caching Strategy

#### Multi-Level Caching

```
┌─────────────────────────────────────┐
│           Browser Cache              │  ← Static assets, API responses
├─────────────────────────────────────┤
│           CDN Cache                  │  ← Global content distribution
├─────────────────────────────────────┤
│           Application Cache          │  ← In-memory caching
├─────────────────────────────────────┤
│           Database Cache             │  ← Query result caching
└─────────────────────────────────────┘
```

#### Implementation

**Frontend Caching**:
```typescript
// React Query for API caching
const { data, isLoading } = useQuery({
  queryKey: ['files', userId],
  queryFn: () => fileAPI.getFiles(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

**Backend Caching**:
```go
type CacheService struct {
    cache map[string]interface{}
    mutex sync.RWMutex
}

func (c *CacheService) Get(key string) (interface{}, bool) {
    c.mutex.RLock()
    defer c.mutex.RUnlock()
    value, exists := c.cache[key]
    return value, exists
}
```

### Database Optimization

#### Indexing Strategy

**Primary Indexes**:
```sql
-- User lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- File queries
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_hash_id ON files(hash_id);
CREATE INDEX idx_files_public ON files(is_public);
CREATE INDEX idx_files_created_at ON files(created_at);

-- Sharing queries
CREATE INDEX idx_file_shares_user_id ON file_shares(shared_with_user_id);
CREATE INDEX idx_file_shares_file_id ON file_shares(file_id);
```

**Composite Indexes**:
```sql
-- Complex queries
CREATE INDEX idx_files_user_public ON files(user_id, is_public);
CREATE INDEX idx_files_folder_created ON files(folder_id, created_at);
```

#### Query Optimization

**Efficient Queries**:
```sql
-- User's files with pagination
SELECT f.*, fh.file_size, fh.mime_type
FROM files f
JOIN file_hashes fh ON f.hash_id = fh.id
WHERE f.user_id = $1
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;
```

**Benefits**:
- Reduced I/O operations
- Faster query execution
- Better scalability

### File Upload Optimization

#### Chunked Upload

**Implementation**:
```typescript
const uploadFile = async (file: File) => {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const chunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    await uploadChunk(file.id, i, chunk);
  }
};
```

**Benefits**:
- Resume capability
- Better error handling
- Progress tracking

#### Streaming Processing

**Backend Implementation**:
```go
func UploadFile(c *gin.Context) {
    file, header, err := c.Request.FormFile("file")
    if err != nil {
        c.JSON(400, gin.H{"error": "Invalid file"})
        return
    }
    defer file.Close()
    
    // Stream processing
    hasher := sha256.New()
    writer := io.MultiWriter(hasher, fileWriter)
    
    _, err = io.Copy(writer, file)
    if err != nil {
        c.JSON(500, gin.H{"error": "Upload failed"})
        return
    }
}
```

---

## Scalability Architecture

### Horizontal Scaling

#### Load Balancing

**Nginx Configuration**:
```nginx
upstream backend {
    server backend1:8081 weight=3;
    server backend2:8081 weight=3;
    server backend3:8081 weight=2;
}

server {
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Benefits**:
- High availability
- Load distribution
- Fault tolerance

#### Database Scaling

**Read Replicas**:
```yaml
services:
  db-master:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=filevault
    volumes:
      - postgres_master_data:/var/lib/postgresql/data

  db-replica:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=filevault
      - POSTGRES_MASTER_HOST=db-master
    depends_on:
      - db-master
```

**Connection Pooling**:
```go
type DatabasePool struct {
    master *sql.DB
    replica *sql.DB
}

func (p *DatabasePool) GetConnection(readOnly bool) *sql.DB {
    if readOnly && p.replica != nil {
        return p.replica
    }
    return p.master
}
```

### Microservices Architecture

#### Service Decomposition

**Current Monolith**:
```
┌─────────────────────────────────────┐
│           File Vault API             │
├─────────────────────────────────────┤
│  Auth │ Files │ Folders │ Sharing    │
└─────────────────────────────────────┘
```

**Future Microservices**:
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│   Auth  │  │  Files  │  │ Folders │  │ Sharing │
│ Service │  │ Service │  │ Service │  │ Service │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
     │           │           │           │
     └───────────┼───────────┼───────────┘
                 │           │
         ┌───────▼───────────▼───────┐
         │     API Gateway           │
         └───────────────────────────┘
```

**Benefits**:
- Independent scaling
- Technology diversity
- Fault isolation
- Team autonomy

---

## Monitoring Architecture

### Observability Stack

#### Logging

**Structured Logging**:
```go
type Logger struct {
    logger *logrus.Logger
}

func (l *Logger) LogRequest(c *gin.Context) {
    l.logger.WithFields(logrus.Fields{
        "method": c.Request.Method,
        "path": c.Request.URL.Path,
        "user_id": c.GetInt("user_id"),
        "ip": c.ClientIP(),
        "user_agent": c.Request.UserAgent(),
    }).Info("Request processed")
}
```

**Log Aggregation**:
```yaml
services:
  fluentd:
    image: fluent/fluentd
    volumes:
      - ./fluentd.conf:/fluentd/etc/fluent.conf
    ports:
      - "24224:24224"
```

#### Metrics

**Application Metrics**:
```go
type Metrics struct {
    requestsTotal    prometheus.Counter
    requestDuration  prometheus.Histogram
    activeUsers      prometheus.Gauge
}

func (m *Metrics) RecordRequest(method, path string, duration time.Duration) {
    m.requestsTotal.WithLabelValues(method, path).Inc()
    m.requestDuration.WithLabelValues(method, path).Observe(duration.Seconds())
}
```

**System Metrics**:
```bash
# Docker stats
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Database metrics
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public';
```

#### Tracing

**Distributed Tracing**:
```go
func TraceRequest(c *gin.Context) {
    span := tracer.StartSpan("http_request")
    defer span.Finish()
    
    span.SetTag("http.method", c.Request.Method)
    span.SetTag("http.url", c.Request.URL.String())
    span.SetTag("user.id", c.GetInt("user_id"))
    
    c.Set("span", span)
    c.Next()
}
```

### Health Checks

#### Service Health

**Health Endpoints**:
```go
func HealthCheck(c *gin.Context) {
    health := map[string]interface{}{
        "status": "healthy",
        "timestamp": time.Now(),
        "version": "1.0.0",
        "services": map[string]interface{}{
            "database": checkDatabase(),
            "storage": checkStorage(),
            "cache": checkCache(),
        },
    }
    
    c.JSON(200, health)
}
```

**Docker Health Checks**:
```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## Deployment Architecture

### CI/CD Pipeline

#### Build Pipeline

```
Code Push → Build → Test → Security Scan → Deploy → Monitor
     ↓         ↓       ↓         ↓           ↓         ↓
   GitHub   Docker   Jest    Trivy      Docker    Prometheus
   Actions  Build   Tests   Scanner    Compose   Grafana
```

**GitHub Actions**:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          docker compose -f docker-compose.test.yml up --abort-on-container-exit
          
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build images
        run: |
          docker compose build
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          docker compose -f docker-compose.prod.yml up -d
```

### Environment Management

#### Environment Configuration

**Development**:
```bash
# .env.development
BACKEND_ENV=development
LOG_LEVEL=debug
RATE_LIMIT_REQUESTS_PER_SECOND=100
```

**Production**:
```bash
# .env.production
BACKEND_ENV=production
LOG_LEVEL=info
RATE_LIMIT_REQUESTS_PER_SECOND=10
```

#### Feature Flags

**Implementation**:
```go
type FeatureFlags struct {
    EnableChunkedUpload bool
    EnableAdvancedSearch bool
    EnableRealTimeSync bool
}

func (ff *FeatureFlags) IsEnabled(flag string) bool {
    switch flag {
    case "chunked_upload":
        return ff.EnableChunkedUpload
    case "advanced_search":
        return ff.EnableAdvancedSearch
    case "real_time_sync":
        return ff.EnableRealTimeSync
    default:
        return false
    }
}
```

---

## Disaster Recovery

### Backup Strategy

#### Database Backups

**Automated Backups**:
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="filevault_backup_${DATE}.sql"

# Create backup
docker compose exec -T db pg_dump -U filevault filevault > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/$BACKUP_FILE.gz s3://backup-bucket/

# Cleanup old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

#### File Storage Backups

**Incremental Backups**:
```bash
#!/bin/bash
# file_backup.sh

SOURCE_DIR="/uploads"
BACKUP_DIR="/backups/files"
DATE=$(date +%Y%m%d)

# Create incremental backup
rsync -av --link-dest=$BACKUP_DIR/latest $SOURCE_DIR/ $BACKUP_DIR/$DATE/

# Update latest symlink
ln -sfn $BACKUP_DIR/$DATE $BACKUP_DIR/latest
```

### Recovery Procedures

#### Database Recovery

**Point-in-Time Recovery**:
```bash
# Stop services
docker compose down

# Restore database
docker compose up -d db
docker compose exec -T db psql -U filevault filevault < backup.sql

# Start all services
docker compose up -d
```

#### Full System Recovery

**Disaster Recovery Plan**:
1. **Assessment**: Evaluate damage and data loss
2. **Infrastructure**: Provision new infrastructure
3. **Data Recovery**: Restore from backups
4. **Service Recovery**: Start services in order
5. **Validation**: Verify system functionality
6. **Monitoring**: Ensure system stability

---

## Future Enhancements

### Planned Improvements

#### Performance Enhancements

1. **CDN Integration**: Global content distribution
2. **Redis Caching**: In-memory caching layer
3. **Database Sharding**: Horizontal database scaling
4. **Microservices**: Service decomposition

#### Feature Enhancements

1. **Real-time Collaboration**: WebSocket-based real-time updates
2. **Advanced Search**: Full-text search with Elasticsearch
3. **Mobile Apps**: Native iOS and Android applications
4. **API Versioning**: Backward-compatible API evolution

#### Security Enhancements

1. **End-to-End Encryption**: Client-side encryption
2. **Zero-Knowledge Architecture**: Server-side encryption
3. **Advanced Authentication**: Multi-factor authentication
4. **Audit Logging**: Comprehensive activity tracking

### Technology Roadmap

#### Short Term (3-6 months)

- **Performance Optimization**: Caching and query optimization
- **Security Hardening**: Enhanced authentication and encryption
- **Monitoring**: Comprehensive observability stack
- **Testing**: Increased test coverage

#### Medium Term (6-12 months)

- **Microservices**: Service decomposition
- **Mobile Apps**: Native mobile applications
- **Advanced Features**: Real-time collaboration
- **Scalability**: Horizontal scaling capabilities

#### Long Term (12+ months)

- **AI Integration**: Smart file organization
- **Global Distribution**: Multi-region deployment
- **Enterprise Features**: Advanced admin capabilities
- **Compliance**: GDPR, SOC2 compliance

---

## Conclusion

The Secure File Vault architecture provides a solid foundation for a scalable, secure, and maintainable file storage platform. The layered architecture, content-based deduplication, and comprehensive security measures ensure both performance and data protection. The modular design allows for future enhancements and scaling as the platform grows.

Key architectural strengths:
- **Scalability**: Horizontal scaling capabilities
- **Security**: Multi-layered security approach
- **Performance**: Optimized for speed and efficiency
- **Maintainability**: Clean separation of concerns
- **Reliability**: Comprehensive monitoring and recovery

The architecture is designed to evolve with changing requirements while maintaining stability and performance.
