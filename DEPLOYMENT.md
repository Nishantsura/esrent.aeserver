# Deployment Guide

## Environment Variables Required

### For Railway Deployment:

1. **FIREBASE_SERVICE_ACCOUNT_JSON**
   - The entire JSON content of your Firebase service account file
   - Copy the content from `adminsdk-j0363-0e084c0150.json` or `serviceAccountKey.json`
   - In Railway, set this as a multi-line environment variable

2. **FRONTEND_URL**
   - Your frontend application URL for CORS configuration
   - Set to: `https://e-srent-ae.vercel.app`

3. **NODE_ENV** (automatically set by Railway)
   - Will be set to `production` automatically

4. **PORT** (automatically set by Railway)
   - Railway will automatically set this

## Railway Deployment Steps

1. Connect your GitHub repository to Railway
2. Create a new project in Railway
3. Connect to your GitHub repository
4. Set the environment variables listed above
5. Railway will automatically detect and deploy your Node.js application

## Local Development

For local development, create a `.env` file with:
```
FIREBASE_SERVICE_ACCOUNT_JSON=<your-firebase-json>
FRONTEND_URL=https://e-srent-ae.vercel.app
NODE_ENV=development
PORT=5000
``` 