# Secure File Vault API Documentation

## Overview

The Secure File Vault API is a RESTful service built with Go and Gin framework. It provides secure file storage, management, and sharing capabilities with advanced deduplication features.

## Base URL

- **Development**: `http://localhost:8081`
- **Production**: Configure via environment variables

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **Default**: 10 requests per second per user
- **Configurable**: Via `RATE_LIMIT_RPS` environment variable
- **Response**: 429 Too Many Requests when exceeded

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `413` - Payload Too Large
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Authentication Endpoints

### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "string (required, 3-50 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "token": "jwt-token-string",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "is_admin": false,
    "storage_quota_mb": 10,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Invalid input data
- `409` - Username or email already exists

### Login User

**POST** `/api/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "is_admin": false,
    "storage_quota_mb": 10,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Invalid credentials

### Get User Profile

**GET** `/api/auth/profile`

Get current user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "is_admin": false,
  "storage_quota_mb": 10,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

### Get User Storage Stats

**GET** `/api/auth/stats`

Get current user's storage usage statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "total_used_bytes": 1048576,
  "original_bytes": 2097152,
  "saved_bytes": 1048576,
  "saved_percentage": 50.0,
  "quota_bytes": 10485760,
  "used_percentage": 10.0,
  "storage_quota_mb": 10,
  "used_storage_mb": 1,
  "total_files": 5
}
```

---

## File Management Endpoints

### Upload Files

**POST** `/api/files/upload`

Upload one or more files with metadata.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `files[]` - File(s) to upload (required)
- `folder_id` - Optional folder ID (integer)
- `is_public` - Make files public (boolean, default: false)
- `tags[]` - Array of tags (strings)

**Response (201 Created):**
```json
{
  "message": "Files uploaded successfully",
  "files": [
    {
      "id": 1,
      "original_name": "document.pdf",
      "file_size": 1048576,
      "mime_type": "application/pdf",
      "is_public": false,
      "created_at": "2023-01-01T00:00:00Z",
      "download_count": 0,
      "username": "testuser",
      "user_id": 1
    }
  ]
}
```

**Error Responses:**
- `400` - Invalid file or metadata
- `413` - File too large or quota exceeded
- `415` - Unsupported file type

### List User Files

**GET** `/api/files`

Get paginated list of user's files with search and filtering.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `query` - Search term for file names
- `mime_type` - Filter by MIME type
- `min_size` - Minimum file size in bytes
- `max_size` - Maximum file size in bytes
- `start_date` - Filter files created after date (ISO 8601)
- `end_date` - Filter files created before date (ISO 8601)
- `tags` - Comma-separated list of tags
- `uploader` - Filter by uploader username
- `folder_id` - Filter by folder ID
- `sort_by` - Sort field (name, size, created_at, download_count)
- `sort_order` - Sort direction (asc, desc)

**Response (200 OK):**
```json
{
  "files": [
    {
      "id": 1,
      "original_name": "document.pdf",
      "file_size": 1048576,
      "mime_type": "application/pdf",
      "is_public": false,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "download_count": 5,
      "username": "testuser",
      "user_id": 1,
      "hash_sha256": "abc123...",
      "folder_name": "Documents",
      "tags": ["work", "important"],
      "reference_count": 2,
      "is_duplicate": true
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "total_pages": 3
}
```

### Get File Details

**GET** `/api/files/:id`

Get detailed information about a specific file.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "original_name": "document.pdf",
  "file_size": 1048576,
  "mime_type": "application/pdf",
  "is_public": false,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "download_count": 5,
  "username": "testuser",
  "user_id": 1,
  "hash_sha256": "abc123...",
  "folder_name": "Documents",
  "tags": ["work", "important"],
  "reference_count": 2,
  "is_duplicate": true
}
```

**Error Responses:**
- `404` - File not found
- `403` - Access denied (not owner or shared)

### Download File

**GET** `/api/files/:id/download`

Download a private file (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
- **Content-Type**: Based on file's MIME type
- **Content-Disposition**: `attachment; filename="original-name.ext"`
- **Body**: Binary file content

**Error Responses:**
- `404` - File not found
- `403` - Access denied

### Download Public File

**GET** `/api/files/public/:id/download`

Download a public file (no authentication required).

**Response (200 OK):**
- **Content-Type**: Based on file's MIME type
- **Content-Disposition**: `attachment; filename="original-name.ext"`
- **Body**: Binary file content

**Error Responses:**
- `404` - File not found or not public
- `403` - File is private

### Delete File

**DELETE** `/api/files/:id`

Delete a file (only owner can delete).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "File deleted successfully"
}
```

**Error Responses:**
- `404` - File not found
- `403` - Not authorized to delete

### Get Public Files

**GET** `/api/files/public`

Get paginated list of all public files.

**Query Parameters:** Same as `/api/files` endpoint

**Response (200 OK):** Same format as `/api/files` endpoint

---

## Folder Management Endpoints

### Create Folder

**POST** `/api/folders`

Create a new folder.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (required, 1-255 chars)",
  "parent_id": "integer (optional)",
  "is_public": "boolean (default: false)"
}
```

**Response (201 Created):**
```json
{
  "message": "Folder created successfully",
  "folder": {
    "id": 1,
    "name": "Documents",
    "parent_id": null,
    "is_public": false,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "user_id": 1
  }
}
```

### List Folders

**GET** `/api/folders`

Get user's folders with optional filtering.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `parent_id` - Filter by parent folder ID
- `is_public` - Filter by public/private status

**Response (200 OK):**
```json
{
  "folders": [
    {
      "id": 1,
      "name": "Documents",
      "parent_id": null,
      "is_public": false,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "username": "testuser",
      "parent_name": null,
      "file_count": 5,
      "folder_size": 1048576,
      "subfolder_count": 2
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

### Get Folder Files

**GET** `/api/folders/:id/files`

Get files in a specific folder.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:** Same as `/api/files` endpoint

**Response (200 OK):** Same format as `/api/files` endpoint

### Update Folder

**PUT** `/api/folders/:id`

Update folder properties.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "parent_id": "integer (optional)",
  "is_public": "boolean (optional)"
}
```

### Delete Folder

**DELETE** `/api/folders/:id`

Delete a folder (must be empty).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Folder deleted successfully"
}
```

---

## Admin Endpoints

### Get System Statistics

**GET** `/api/admin/stats`

Get comprehensive system statistics (admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200 OK):**
```json
{
  "total_files": 1000,
  "total_users": 50,
  "total_storage_bytes": 1073741824,
  "total_downloads": 5000,
  "public_files": 100,
  "unique_files": 800,
  "unique_storage_bytes": 858993459,
  "savings_bytes": 214748365,
  "savings_percentage": 20.0
}
```

### Get All Files (Admin)

**GET** `/api/admin/files`

Get all files in the system (admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:** Same as `/api/files` endpoint

**Response (200 OK):** Same format as `/api/files` endpoint

### Get All Users (Admin)

**GET** `/api/admin/users`

Get all users in the system (admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "is_admin": false,
      "storage_quota_mb": 10,
      "created_at": "2023-01-01T00:00:00Z",
      "file_count": 5,
      "used_storage_bytes": 1048576,
      "total_downloads": 25
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

### Update User Quota (Admin)

**PUT** `/api/admin/users/:id/quota`

Update user's storage quota (admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "storage_quota_mb": 100
}
```

**Response (200 OK):**
```json
{
  "message": "User quota updated successfully"
}
```

---

## WebSocket Endpoints

### Real-time Updates

**WebSocket** `/ws`

Connect to real-time updates for file changes, download counts, and system statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Message Types:**
- `file_uploaded` - New file uploaded
- `file_deleted` - File deleted
- `download_count` - Download count updated
- `storage_stats` - Storage statistics updated

**Example Message:**
```json
{
  "type": "file_uploaded",
  "data": {
    "file_id": 1,
    "filename": "document.pdf",
    "user_id": 1,
    "timestamp": "2023-01-01T00:00:00Z"
  }
}
```

---

## Data Models

### File Model
```json
{
  "id": "integer",
  "user_id": "integer",
  "hash_id": "integer",
  "original_name": "string",
  "display_name": "string",
  "folder_id": "integer|null",
  "is_public": "boolean",
  "download_count": "integer",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)",
  "hash_sha256": "string",
  "file_size": "integer",
  "mime_type": "string",
  "username": "string",
  "folder_name": "string|null",
  "tags": "array of strings",
  "reference_count": "integer",
  "is_duplicate": "boolean"
}
```

### User Model
```json
{
  "id": "integer",
  "username": "string",
  "email": "string",
  "is_admin": "boolean",
  "storage_quota_mb": "integer",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

### Folder Model
```json
{
  "id": "integer",
  "user_id": "integer",
  "name": "string",
  "parent_id": "integer|null",
  "is_public": "boolean",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)",
  "username": "string",
  "parent_name": "string|null",
  "file_count": "integer",
  "folder_size": "integer",
  "subfolder_count": "integer"
}
```

---

## Examples

### Complete File Upload Flow

```bash
# 1. Register user
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# 2. Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'

# 3. Upload file
curl -X POST http://localhost:8081/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "files[]=@document.pdf" \
  -F "is_public=false" \
  -F "tags[]=work" \
  -F "tags[]=important"

# 4. List files
curl -X GET http://localhost:8081/api/files \
  -H "Authorization: Bearer <token>"

# 5. Download file
curl -X GET http://localhost:8081/api/files/1/download \
  -H "Authorization: Bearer <token>" \
  -o downloaded_file.pdf
```

### Admin Operations

```bash
# Get system stats
curl -X GET http://localhost:8081/api/admin/stats \
  -H "Authorization: Bearer <admin-token>"

# Update user quota
curl -X PUT http://localhost:8081/api/admin/users/1/quota \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"storage_quota_mb": 100}'
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
class FileVaultAPI {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async login(username: string, password: string) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    this.token = data.token;
    return data;
  }

  async uploadFile(file: File, options: { folderId?: number, isPublic?: boolean, tags?: string[] } = {}) {
    const formData = new FormData();
    formData.append('files[]', file);
    
    if (options.folderId) formData.append('folder_id', options.folderId.toString());
    if (options.isPublic) formData.append('is_public', 'true');
    if (options.tags) options.tags.forEach(tag => formData.append('tags[]', tag));

    const response = await fetch(`${this.baseURL}/api/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData
    });

    return response.json();
  }

  async getFiles(params: { page?: number, limit?: number, query?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.query) searchParams.append('query', params.query);

    const response = await fetch(`${this.baseURL}/api/files?${searchParams}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    return response.json();
  }
}

// Usage
const api = new FileVaultAPI('http://localhost:8081');
await api.login('testuser', 'password123');
const files = await api.getFiles({ page: 1, limit: 10 });
```

### Python

```python
import requests
from typing import Optional, List, Dict, Any

class FileVaultAPI:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None

    def login(self, username: str, password: str) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": username, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["token"]
        return data

    def upload_file(self, file_path: str, folder_id: Optional[int] = None, 
                   is_public: bool = False, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        with open(file_path, 'rb') as f:
            files = {'files[]': f}
            data = {}
            if folder_id:
                data['folder_id'] = folder_id
            if is_public:
                data['is_public'] = True
            if tags:
                data['tags[]'] = tags

            response = requests.post(
                f"{self.base_url}/api/files/upload",
                headers={'Authorization': f'Bearer {self.token}'},
                files=files,
                data=data
            )
        response.raise_for_status()
        return response.json()

    def get_files(self, page: int = 1, limit: int = 10, query: Optional[str] = None) -> Dict[str, Any]:
        params = {'page': page, 'limit': limit}
        if query:
            params['query'] = query

        response = requests.get(
            f"{self.base_url}/api/files",
            headers={'Authorization': f'Bearer {self.token}'},
            params=params
        )
        response.raise_for_status()
        return response.json()

# Usage
api = FileVaultAPI('http://localhost:8081')
api.login('testuser', 'password123')
files = api.get_files(page=1, limit=10)
```

---

## Postman Collection

A complete Postman collection is available at `docs/postman/SecureFileVault.postman_collection.json` with:

- Pre-configured environment variables
- Example requests for all endpoints
- Automated tests for response validation
- Authentication token management

Import the collection into Postman and configure the environment variables:
- `base_url`: `http://localhost:8081`
- `token`: (will be set automatically after login)

---

## OpenAPI Specification

A complete OpenAPI 3.0 specification is available at `docs/openapi.yaml` with:

- Detailed endpoint documentation
- Request/response schemas
- Authentication requirements
- Example requests and responses

Generate client SDKs using tools like:
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger Codegen](https://swagger.io/tools/swagger-codegen/)

---

## Rate Limiting Details

The API implements sliding window rate limiting:

- **Window Size**: 1 second
- **Default Limit**: 10 requests per second per user
- **Headers**: 
  - `X-RateLimit-Limit`: Current limit
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Window reset timestamp

**Rate Limit Exceeded Response (429):**
```json
{
  "error": "Rate limit exceeded. Try again later.",
  "retry_after": 1
}
```

---

## File Deduplication

The system automatically deduplicates files based on SHA-256 content hashing:

1. **Upload Process**:
   - Calculate SHA-256 hash of file content
   - Check if hash already exists in `file_hashes` table
   - If exists: Create new file record referencing existing hash
   - If new: Store file content and create new hash record

2. **Storage Savings**:
   - `savings_bytes` = `total_storage_bytes` - `unique_storage_bytes`
   - `savings_percentage` = (`savings_bytes` / `total_storage_bytes`) * 100

3. **Cleanup**:
   - Physical files are deleted only when no file records reference the hash
   - Reference counting prevents accidental data loss

---

## Security Considerations

1. **File Upload Security**:
   - MIME type validation
   - File size limits
   - Storage quota enforcement
   - Malicious file detection

2. **Authentication Security**:
   - JWT tokens with expiration
   - Password hashing with bcrypt
   - Rate limiting on auth endpoints

3. **Access Control**:
   - File ownership validation
   - Admin-only endpoints
   - Public/private file access control

4. **Data Protection**:
   - Secure file storage
   - Database connection encryption
   - Input validation and sanitization
