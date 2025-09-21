# 🚨 Render Deployment Troubleshooting Guide

## Database Connection Issues

### Error: `dial tcp: lookup dpg-xxxxx-a on 169.254.20.10:53: no such host`

This error occurs when the backend service tries to connect to the database before the database service is fully deployed and available.

## 🔧 Solutions

### Solution 1: Deploy Database First (Recommended)

1. **Go to Render Dashboard**
2. **Create Database First**:
   - Click "New +" → "PostgreSQL"
   - Name: `secure-file-vault-db`
   - Plan: `Free`
   - Click "Create Database"
3. **Wait for Database to be Available**:
   - Status should show "Available" (green)
   - Note the connection string
4. **Then Deploy Backend**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure as Docker service
   - Set environment variables including `DATABASE_URL`

### Solution 2: Use Blueprint Deployment (Current Approach)

The `render.yaml` file should deploy the database first, but sometimes there are timing issues.

**Steps to fix:**

1. **Delete Failed Services**:
   - Go to Render dashboard
   - Delete the failed backend service
   - Keep the database if it was created

2. **Redeploy from Blueprint**:
   - Go to "Blueprints" in Render dashboard
   - Find your blueprint
   - Click "Apply" to redeploy

3. **Manual Database Creation** (if needed):
   - If database wasn't created, create it manually first
   - Then redeploy the blueprint

### Solution 3: Manual Service Creation

If blueprint deployment continues to fail:

1. **Create Database**:
   ```
   Name: secure-file-vault-db
   Plan: Free
   ```

2. **Create Backend Service**:
   ```
   Name: secure-file-vault-backend
   Environment: Docker
   Dockerfile Path: ./backend/Dockerfile
   Docker Context: ./backend
   Plan: Free
   ```

3. **Set Environment Variables**:
   ```
   DATABASE_URL=<from database service>
   JWT_SECRET=<generate new>
   PORT=10000
   GIN_MODE=release
   UPLOAD_DIR=/tmp/uploads
   RATE_LIMIT_RPS=100
   DEFAULT_QUOTA_MB=1000
   MAX_FILE_SIZE_MB=100
   ```

4. **Create Frontend Service**:
   ```
   Name: secure-file-vault-frontend
   Environment: Docker
   Dockerfile Path: ./frontend/Dockerfile
   Docker Context: ./frontend
   Plan: Free
   ```

5. **Set Frontend Environment Variables**:
   ```
   REACT_APP_API_URL=https://secure-file-vault-backend.onrender.com
   NODE_ENV=production
   PORT=10000
   ```

## 🔍 Debugging Steps

### 1. Check Database Status
- Go to database service dashboard
- Ensure status is "Available" (green)
- Check connection string format

### 2. Check Backend Logs
- Go to backend service dashboard
- Click "Logs" tab
- Look for database connection messages
- Check for retry attempts

### 3. Verify Environment Variables
- Go to backend service settings
- Click "Environment" tab
- Ensure `DATABASE_URL` is set correctly
- Format should be: `postgres://user:password@host:port/database`

### 4. Test Database Connection
- Use the database connection string from Render
- Test with a PostgreSQL client
- Ensure the database is accessible

## 📋 Common Issues and Fixes

### Issue: Database URL Format
**Problem**: `DATABASE_URL` format is incorrect
**Fix**: Ensure format is `postgres://user:password@host:port/database`

### Issue: Database Not Ready
**Problem**: Backend starts before database is available
**Fix**: Wait for database status to be "Available" before deploying backend

### Issue: Network Connectivity
**Problem**: Services can't reach each other
**Fix**: Ensure all services are in the same region

### Issue: Environment Variable Not Set
**Problem**: `DATABASE_URL` is empty or undefined
**Fix**: Check environment variable configuration in service settings

## 🚀 Quick Fix Commands

### Reset Deployment
1. Delete all services in Render dashboard
2. Delete the blueprint
3. Push updated code to GitHub
4. Create new blueprint from repository

### Manual Database Creation
```bash
# In Render dashboard:
1. New + → PostgreSQL
2. Name: secure-file-vault-db
3. Plan: Free
4. Create Database
5. Wait for "Available" status
6. Copy connection string
```

### Manual Backend Creation
```bash
# In Render dashboard:
1. New + → Web Service
2. Connect GitHub repository
3. Environment: Docker
4. Dockerfile Path: ./backend/Dockerfile
5. Docker Context: ./backend
6. Set DATABASE_URL environment variable
7. Deploy
```

## 📞 Getting Help

1. **Check Render Documentation**: [render.com/docs](https://render.com/docs)
2. **Render Support**: Available through dashboard
3. **Community Forums**: Render community forums
4. **GitHub Issues**: Check for similar issues in your repository

## ✅ Success Indicators

When deployment is successful, you should see:

1. **Database**: Status "Available" (green)
2. **Backend**: Status "Live" (green)
3. **Frontend**: Status "Live" (green)
4. **Health Check**: `https://your-backend.onrender.com/health` returns 200 OK
5. **Frontend**: `https://your-frontend.onrender.com` loads the React app

---

**Remember**: Database services take longer to deploy than web services. Always ensure the database is fully available before deploying dependent services.
