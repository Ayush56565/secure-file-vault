# Database Schema Documentation

## Overview

The Secure File Vault uses PostgreSQL as its primary database with a carefully designed schema optimized for file storage, deduplication, and user management. The schema supports hierarchical folder structures, file sharing, tagging, and comprehensive analytics.

## Database Configuration

- **Database**: PostgreSQL 15+
- **Default Database**: `filevault`
- **Default User**: `filevault`
- **Port**: 5433 (configurable)
- **SSL**: Disabled for development, enabled for production

## Schema Design Principles

1. **Deduplication**: Content-based deduplication using SHA-256 hashing
2. **Referential Integrity**: Foreign key constraints with appropriate cascade behaviors
3. **Performance**: Strategic indexing for common query patterns
4. **Auditability**: Timestamps and user tracking for all operations
5. **Scalability**: Normalized design with efficient query patterns

---

## Tables Overview

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User accounts and quotas | Admin roles, storage quotas |
| `file_hashes` | Content deduplication | SHA-256 hashing, MIME types |
| `files` | File metadata and references | Ownership, public/private, downloads |
| `folders` | Hierarchical organization | Nested structure, public/private |
| `file_shares` | User-specific sharing | Permission levels |
| `folder_shares` | Folder sharing | Permission inheritance |
| `file_tags` | File categorization | Flexible tagging system |
| `rate_limits` | API protection | Per-user, per-endpoint tracking |

---

## Detailed Table Schemas

### Users Table

**Purpose**: Store user accounts, authentication data, and storage quotas.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    storage_quota_mb INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Primary key, auto-incrementing
- `username`: Unique username (3-50 characters)
- `email`: Unique email address
- `password_hash`: bcrypt hashed password
- `is_admin`: Admin privileges flag
- `storage_quota_mb`: Storage limit in megabytes (default: 10MB)
- `created_at`: Account creation timestamp
- `updated_at`: Last modification timestamp

**Constraints**:
- Username and email must be unique
- Password hash is required
- Storage quota must be positive

**Indexes**:
- Primary key on `id`
- Unique index on `username`
- Unique index on `email`

### File Hashes Table

**Purpose**: Store file content hashes for deduplication and metadata.

```sql
CREATE TABLE file_hashes (
    id SERIAL PRIMARY KEY,
    hash_sha256 VARCHAR(64) UNIQUE NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Primary key, auto-incrementing
- `hash_sha256`: SHA-256 hash of file content (64 characters)
- `file_size`: File size in bytes
- `mime_type`: MIME type of the file
- `created_at`: Hash creation timestamp

**Constraints**:
- Hash must be unique (enables deduplication)
- File size must be positive
- MIME type is required

**Indexes**:
- Primary key on `id`
- Unique index on `hash_sha256`

**Deduplication Logic**:
- Multiple files can reference the same hash
- Physical file is stored only once per unique hash
- Reference counting prevents premature deletion

### Files Table

**Purpose**: Store file metadata, ownership, and access control.

```sql
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    hash_id INTEGER REFERENCES file_hashes(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Primary key, auto-incrementing
- `user_id`: Owner user ID (foreign key)
- `hash_id`: Reference to file content hash (foreign key)
- `original_name`: Original filename from upload
- `display_name`: Display name (can be modified)
- `folder_id`: Optional folder assignment
- `is_public`: Public visibility flag
- `download_count`: Download counter
- `created_at`: File creation timestamp
- `updated_at`: Last modification timestamp

**Constraints**:
- User ID must reference existing user
- Hash ID must reference existing hash
- Folder ID can be null (root level)
- Original and display names are required

**Indexes**:
- Primary key on `id`
- Index on `user_id` (for user's files)
- Index on `hash_id` (for deduplication queries)
- Index on `is_public` (for public file queries)
- Index on `created_at` (for sorting)

**Cascade Behaviors**:
- `ON DELETE CASCADE` for user_id: Files deleted when user is deleted
- `ON DELETE CASCADE` for hash_id: Files deleted when hash is deleted
- `ON DELETE SET NULL` for folder_id: Files moved to root when folder deleted

### Folders Table

**Purpose**: Hierarchical folder organization with public/private access.

```sql
CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Primary key, auto-incrementing
- `user_id`: Owner user ID (foreign key)
- `name`: Folder name
- `parent_id`: Parent folder ID (self-referencing)
- `is_public`: Public visibility flag
- `created_at`: Folder creation timestamp
- `updated_at`: Last modification timestamp

**Constraints**:
- User ID must reference existing user
- Parent ID can be null (root level) or reference existing folder
- Folder name is required
- Prevents circular references (enforced by application logic)

**Indexes**:
- Primary key on `id`
- Index on `user_id` (for user's folders)
- Index on `parent_id` (for hierarchy queries)

**Hierarchy Support**:
- Self-referencing foreign key enables nested folders
- Root folders have `parent_id = NULL`
- Cascade delete removes subfolders when parent is deleted

### File Shares Table

**Purpose**: User-specific file sharing with permission levels.

```sql
CREATE TABLE file_shares (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) DEFAULT 'read',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, shared_with_user_id)
);
```

**Fields**:
- `id`: Primary key, auto-incrementing
- `file_id`: File being shared (foreign key)
- `shared_with_user_id`: User receiving access (foreign key)
- `permission`: Permission level ('read', 'write')
- `created_at`: Share creation timestamp

**Constraints**:
- Unique constraint on (file_id, shared_with_user_id)
- Permission must be valid enum value
- Cascade delete when file or user is deleted

**Indexes**:
- Primary key on `id`
- Unique index on (file_id, shared_with_user_id)
- Index on `file_id` (for file access queries)
- Index on `shared_with_user_id` (for user's shared files)

### Folder Shares Table

**Purpose**: User-specific folder sharing with permission inheritance.

```sql
CREATE TABLE folder_shares (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) DEFAULT 'read',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(folder_id, shared_with_user_id)
);
```

**Fields**:
- `id`: Primary key, auto-incrementing
- `folder_id`: Folder being shared (foreign key)
- `shared_with_user_id`: User receiving access (foreign key)
- `permission`: Permission level ('read', 'write')
- `created_at`: Share creation timestamp

**Constraints**:
- Unique constraint on (folder_id, shared_with_user_id)
- Permission must be valid enum value
- Cascade delete when folder or user is deleted

**Indexes**:
- Primary key on `id`
- Unique index on (folder_id, shared_with_user_id)
- Index on `folder_id` (for folder access queries)
- Index on `shared_with_user_id` (for user's shared folders)

### File Tags Table

**Purpose**: Flexible file categorization and search.

```sql
CREATE TABLE file_tags (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, tag)
);
```

**Fields**:
- `id`: Primary key, auto-incrementing
- `file_id`: File being tagged (foreign key)
- `tag`: Tag name (max 50 characters)
- `created_at`: Tag creation timestamp

**Constraints**:
- Unique constraint on (file_id, tag)
- Tag name is required
- Cascade delete when file is deleted

**Indexes**:
- Primary key on `id`
- Unique index on (file_id, tag)
- Index on `file_id` (for file's tags)
- Index on `tag` (for tag-based searches)

### Rate Limits Table

**Purpose**: Track API usage for rate limiting enforcement.

```sql
CREATE TABLE rate_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(100) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Primary key, auto-incrementing
- `user_id`: User making requests (foreign key)
- `endpoint`: API endpoint being accessed
- `request_count`: Number of requests in current window
- `window_start`: Start of current rate limit window
- `created_at`: Record creation timestamp

**Constraints**:
- User ID must reference existing user
- Endpoint name is required
- Request count must be positive

**Indexes**:
- Primary key on `id`
- Index on (user_id, endpoint) (for rate limit queries)

---

## Performance Indexes

### Strategic Indexing

The schema includes carefully designed indexes for optimal query performance:

```sql
-- File access patterns
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_hash_id ON files(hash_id);
CREATE INDEX idx_files_public ON files(is_public);
CREATE INDEX idx_files_created_at ON files(created_at);

-- Hash lookups
CREATE INDEX idx_file_hashes_hash ON file_hashes(hash_sha256);

-- Folder hierarchy
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);

-- Sharing queries
CREATE INDEX idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX idx_file_shares_user_id ON file_shares(shared_with_user_id);

-- Tag searches
CREATE INDEX idx_file_tags_file_id ON file_tags(file_id);
CREATE INDEX idx_file_tags_tag ON file_tags(tag);

-- Rate limiting
CREATE INDEX idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);
```

### Query Optimization

**Common Query Patterns**:

1. **User's Files**: `WHERE user_id = ? ORDER BY created_at DESC`
2. **Public Files**: `WHERE is_public = true ORDER BY created_at DESC`
3. **File Deduplication**: `WHERE hash_sha256 = ?`
4. **Folder Contents**: `WHERE folder_id = ? ORDER BY original_name`
5. **Tag Search**: `WHERE tag IN (?)`
6. **Shared Files**: `WHERE shared_with_user_id = ?`

---

## Data Relationships

### Entity Relationship Diagram

```
Users (1) ----< Files (N)
  |                |
  |                |
  v                v
Folders (N)    File_Hashes (1)
  |                ^
  |                |
  v                |
Folder_Shares (N)  |
                   |
File_Shares (N) ---+
  |
  v
File_Tags (N)
```

### Relationship Details

1. **User → Files**: One-to-many (user owns many files)
2. **User → Folders**: One-to-many (user owns many folders)
3. **File → File_Hash**: Many-to-one (multiple files can share same content)
4. **Folder → Files**: One-to-many (folder contains many files)
5. **Folder → Folders**: Self-referencing (hierarchical structure)
6. **File → File_Shares**: One-to-many (file can be shared with many users)
7. **File → File_Tags**: One-to-many (file can have many tags)

---

## Data Integrity

### Constraints

**Primary Keys**: All tables have auto-incrementing primary keys
**Foreign Keys**: All relationships enforced with foreign key constraints
**Unique Constraints**: Prevent duplicate usernames, emails, and hash references
**Check Constraints**: Validate data ranges and formats

### Cascade Behaviors

- **User Deletion**: Cascades to files, folders, shares, and rate limits
- **File Deletion**: Cascades to shares and tags
- **Folder Deletion**: Cascades to subfolders, sets files to NULL
- **Hash Deletion**: Cascades to files (prevents orphaned references)

### Triggers

**Automatic Timestamp Updates**:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Deduplication Strategy

### Content-Based Deduplication

The system implements SHA-256 content hashing for automatic deduplication:

1. **Upload Process**:
   - Calculate SHA-256 hash of file content
   - Check if hash exists in `file_hashes` table
   - If exists: Create new file record referencing existing hash
   - If new: Store file content and create new hash record

2. **Storage Efficiency**:
   - Physical files stored only once per unique content
   - Multiple file records can reference same hash
   - Significant storage savings for duplicate content

3. **Reference Counting**:
   - Track number of files referencing each hash
   - Physical file deleted only when reference count reaches zero
   - Prevents accidental data loss

### Deduplication Queries

**Check for Existing Hash**:
```sql
SELECT id FROM file_hashes WHERE hash_sha256 = $1;
```

**Get Reference Count**:
```sql
SELECT COUNT(*) FROM files WHERE hash_id = $1;
```

**Storage Savings Calculation**:
```sql
WITH user_file_refs AS (
    SELECT fh.id, fh.file_size, COUNT(f.id) as reference_count
    FROM file_hashes fh
    JOIN files f ON f.hash_id = fh.id
    WHERE f.user_id = $1
    GROUP BY fh.id, fh.file_size
)
SELECT 
    COUNT(*) as unique_files,
    SUM(reference_count) as total_files,
    COALESCE(SUM(file_size), 0) as unique_size,
    COALESCE(SUM(file_size * reference_count), 0) as total_size
FROM user_file_refs;
```

---

## Migration Strategy

### Schema Evolution

The database supports safe schema evolution through migrations:

1. **Backward Compatibility**: New columns added with defaults
2. **Data Migration**: Transform existing data when needed
3. **Index Management**: Add/remove indexes without downtime
4. **Constraint Updates**: Modify constraints safely

### Migration File Structure

```sql
-- Migration: 001_initial_schema.sql
-- Description: Initial database schema
-- Version: 1.0.0
-- Date: 2023-01-01

-- Tables creation
-- Indexes creation
-- Triggers creation
-- Default data insertion
```

### Migration Best Practices

1. **Atomic Operations**: Each migration is atomic
2. **Rollback Support**: Design migrations to be reversible
3. **Data Validation**: Verify data integrity after migrations
4. **Performance Testing**: Test migration performance on large datasets

---

## Backup and Recovery

### Backup Strategy

**Full Backup**:
```bash
pg_dump -h localhost -U filevault -d filevault > backup.sql
```

**Incremental Backup**:
```bash
pg_basebackup -h localhost -U filevault -D /backup/location
```

### Recovery Procedures

**Point-in-Time Recovery**:
```bash
pg_restore -h localhost -U filevault -d filevault backup.sql
```

**Data Validation**:
```sql
-- Check data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM files;
SELECT COUNT(*) FROM file_hashes;

-- Verify relationships
SELECT COUNT(*) FROM files f 
LEFT JOIN users u ON f.user_id = u.id 
WHERE u.id IS NULL;
```

---

## Performance Monitoring

### Key Metrics

1. **Query Performance**: Monitor slow queries
2. **Index Usage**: Track index utilization
3. **Storage Growth**: Monitor table sizes
4. **Connection Pooling**: Track connection usage

### Monitoring Queries

**Table Sizes**:
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Index Usage**:
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

**Slow Queries**:
```sql
SELECT 
    query,
    calls,
    total_time,
    mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Security Considerations

### Data Protection

1. **Encryption**: Sensitive data encrypted at rest
2. **Access Control**: Database user permissions restricted
3. **Audit Logging**: Track all data modifications
4. **Backup Security**: Encrypted backup storage

### Security Best Practices

1. **Principle of Least Privilege**: Minimal database permissions
2. **Regular Updates**: Keep PostgreSQL updated
3. **Network Security**: Restrict database access
4. **Monitoring**: Track suspicious activities

---

## Scaling Considerations

### Horizontal Scaling

1. **Read Replicas**: Distribute read queries
2. **Sharding**: Partition data by user ID
3. **Caching**: Redis for frequently accessed data
4. **CDN**: Static file delivery

### Vertical Scaling

1. **Memory**: Increase shared_buffers
2. **CPU**: Optimize query execution
3. **Storage**: SSD for better I/O performance
4. **Connections**: Connection pooling

### Future Enhancements

1. **Partitioning**: Partition large tables by date
2. **Archiving**: Move old data to cold storage
3. **Compression**: Compress historical data
4. **Analytics**: Separate analytics database
