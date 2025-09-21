# 🚀 Render Deployment Guide for Secure File Vault

This guide will help you deploy your Secure File Vault application on Render using the provided `render.yaml` configuration.

## 📋 Prerequisites

1. **GitHub Account**: Your code must be pushed to a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com) with GitHub
3. **Domain (Optional)**: Custom domain for your application

## 🛠 Deployment Steps

### Step 1: Prepare Your Repository

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Prepare for Render deployment"
   ```

2. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/secure-file-vault.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Render

1. **Go to [render.com](https://render.com)** and sign up with GitHub

2. **Deploy from Repository**:
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select your repository
   - Render will automatically detect the `render.yaml` file

3. **Review Configuration**:
   - Render will show you the services that will be created:
     - `secure-file-vault-db` (PostgreSQL database)
     - `secure-file-vault-backend` (Go API service)
     - `secure-file-vault-frontend` (React frontend service)

4. **Deploy**:
   - Click "Apply" to deploy all services
   - Wait for deployment to complete (10-15 minutes)

### Step 3: Verify Deployment

1. **Check Service Status**:
   - All services should show "Live" status
   - Database should be "Available"

2. **Test Backend**:
   - Visit: `https://secure-file-vault-backend.onrender.com/health`
   - Should return: `{"status":"healthy","service":"secure-file-vault-backend","version":"1.0.0"}`

3. **Test Frontend**:
   - Visit: `https://secure-file-vault-frontend.onrender.com`
   - Should load the React application

4. **Test Full Application**:
   - Register a new account
   - Login with the account
   - Upload a file
   - Test file sharing

## 🔧 Configuration Details

### Services Created

#### 1. PostgreSQL Database (`secure-file-vault-db`)
- **Plan**: Free (1GB storage)
- **Region**: Oregon
- **Database Name**: `filevault`
- **User**: `filevault`
- **Connection**: Automatically provided via `DATABASE_URL`

#### 2. Backend API (`secure-file-vault-backend`)
- **Type**: Web Service
- **Environment**: Docker
- **Dockerfile**: `./backend/Dockerfile`
- **Context**: `./backend`
- **Plan**: Free
- **Port**: 10000 (automatically set by Render)
- **Disk**: 1GB persistent storage for file uploads

**Environment Variables**:
```
DATABASE_URL=<automatically provided by Render>
JWT_SECRET=<automatically generated>
PORT=10000
GIN_MODE=release
UPLOAD_DIR=/app/uploads
RATE_LIMIT_RPS=100
DEFAULT_QUOTA_MB=1000
MAX_FILE_SIZE_MB=100
```

#### 3. Frontend (`secure-file-vault-frontend`)
- **Type**: Web Service
- **Environment**: Docker
- **Dockerfile**: `./frontend/Dockerfile`
- **Context**: `./frontend`
- **Plan**: Free
- **Port**: 10000 (automatically set by Render)

**Environment Variables**:
```
REACT_APP_API_URL=<automatically set to backend URL>
NODE_ENV=production
PORT=10000
```

## 🌐 URLs After Deployment

- **Frontend**: `https://secure-file-vault-frontend.onrender.com`
- **Backend API**: `https://secure-file-vault-backend.onrender.com`
- **Health Check**: `https://secure-file-vault-backend.onrender.com/health`
- **Database**: Internal connection only

## 🔒 Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **CORS Protection**: Configured for frontend-backend communication
3. **Rate Limiting**: API protection against abuse
4. **File Validation**: Secure file upload with size limits
5. **Database Security**: PostgreSQL with connection string authentication

## 📊 Free Tier Limitations

### Render Free Tier
- **Web Services**: 750 hours/month (sleeps after 15 minutes of inactivity)
- **Database**: 1GB storage, 100 connections
- **Build Time**: 90 minutes/month
- **Bandwidth**: 100GB/month

### Performance Considerations
- **Cold Starts**: First request after sleep takes ~30 seconds
- **File Storage**: 1GB persistent disk for uploads
- **Database**: Shared PostgreSQL instance

## 🚨 Troubleshooting

### Common Issues

1. **Build Fails**:
   - Check Dockerfile paths in `render.yaml`
   - Verify all dependencies are in `package.json`/`go.mod`

2. **Database Connection Fails**:
   - Ensure `DATABASE_URL` is properly set
   - Check database service is "Available"

3. **Frontend Can't Connect to Backend**:
   - Verify `REACT_APP_API_URL` is set correctly
   - Check CORS configuration in backend

4. **File Uploads Fail**:
   - Ensure disk is mounted at `/app/uploads`
   - Check file size limits

### Debugging Steps

1. **Check Logs**:
   - Go to service dashboard
   - Click "Logs" tab
   - Look for error messages

2. **Test Health Endpoint**:
   - Visit `/health` endpoint
   - Should return healthy status

3. **Verify Environment Variables**:
   - Check all required variables are set
   - Ensure no typos in variable names

## 🔄 Updates and Redeployment

### Automatic Updates
- Services are configured with `autoDeploy: true`
- Pushes to main branch automatically trigger redeployment

### Manual Updates
1. Make changes to your code
2. Commit and push to GitHub
3. Render will automatically redeploy

## 💰 Cost Management

### Free Tier Usage
- Monitor usage in Render dashboard
- Services sleep when not in use
- Database has 1GB limit

### Upgrading to Paid Plans
- **Web Service**: $7/month (always on, no sleep)
- **Database**: $7/month (unlimited connections)
- **Disk Storage**: $0.25/GB/month

## 🎯 Next Steps

1. **Custom Domain**: Add your own domain in service settings
2. **SSL Certificate**: Automatically provided by Render
3. **Monitoring**: Set up alerts for service health
4. **Backup**: Configure database backups
5. **Scaling**: Upgrade plans as needed

## 📞 Support

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Render Support**: Available through dashboard
- **Application Issues**: Check logs and health endpoints

---

**🎉 Congratulations!** Your Secure File Vault is now deployed on Render and accessible worldwide!
