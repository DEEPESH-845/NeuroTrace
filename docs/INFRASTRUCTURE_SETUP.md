# Infrastructure Setup Guide

This guide walks you through setting up all external services required for the NeuroTrace Monitoring System.

## Overview

NeuroTrace uses a cost-optimized architecture with free-tier services:

- **Railway.app**: Backend hosting + PostgreSQL database
- **Cloudflare R2**: Object storage for AI models
- **Supabase**: Authentication service
- **Firebase Cloud Messaging**: Push notifications
- **Vercel**: Web dashboard hosting (covered separately)

## 1. Railway.app Setup

Railway provides both backend hosting and PostgreSQL database.

### 1.1 Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub account (recommended for CI/CD integration)
3. Verify your email address

### 1.2 Create New Project

1. Click "New Project" in Railway dashboard
2. Select "Empty Project"
3. Name it "neurotrace-backend"

### 1.3 Add PostgreSQL Database

1. In your project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will provision a PostgreSQL 15 instance
3. Click on the PostgreSQL service to view connection details
4. Copy the `DATABASE_URL` (format: `postgresql://user:password@host:port/database`)

**Free Tier Limits:**
- 1GB storage
- 100 concurrent connections
- 500GB bandwidth/month

### 1.4 Deploy Backend Service

#### Option A: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

#### Option B: Deploy via GitHub Integration

1. In Railway project, click "New" → "GitHub Repo"
2. Connect your GitHub account
3. Select the `neurotrace` repository
4. Railway will auto-detect the `railway.json` configuration
5. Set root directory to `/` (monorepo root)
6. Railway will automatically deploy on push to `main` branch

### 1.5 Configure Environment Variables

In Railway dashboard, go to your backend service → Variables:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-linked from PostgreSQL service
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLOUDFLARE_R2_ACCESS_KEY=your-access-key
CLOUDFLARE_R2_SECRET_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET=neurotrace-models
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
FCM_SERVER_KEY=your-fcm-server-key
ENCRYPTION_KEY=your-256-bit-encryption-key-in-hex
PORT=3000
NODE_ENV=production
```

**Generate Encryption Key:**
```bash
openssl rand -hex 32
```

### 1.6 Run Database Migrations

After first deployment:

```bash
# Using Railway CLI
railway run npm run prisma:migrate --workspace apps/backend

# Or connect directly to database
railway connect postgres
# Then run migrations from local machine with DATABASE_URL
```

### 1.7 Verify Deployment

1. Railway will provide a public URL (e.g., `https://neurotrace-backend.up.railway.app`)
2. Test the health endpoint:
```bash
curl https://your-app.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

## 2. Cloudflare R2 Setup

Cloudflare R2 provides S3-compatible object storage for AI model artifacts.

### 2.1 Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com)
2. Sign up for a free account
3. Verify your email address

### 2.2 Enable R2 Storage

1. In Cloudflare dashboard, go to "R2" in the left sidebar
2. Click "Purchase R2" (free tier available)
3. Accept the terms

**Free Tier Limits:**
- 10GB storage
- 1 million Class A operations/month (writes)
- 10 million Class B operations/month (reads)
- No egress fees

### 2.3 Create R2 Bucket

1. Click "Create bucket"
2. Name: `neurotrace-models`
3. Location: Automatic (or choose closest to your users)
4. Click "Create bucket"

### 2.4 Generate API Tokens

1. Go to "R2" → "Manage R2 API Tokens"
2. Click "Create API token"
3. Token name: `neurotrace-backend`
4. Permissions: "Object Read & Write"
5. Bucket: Select `neurotrace-models`
6. Click "Create API token"

**Save these credentials (shown only once):**
- Access Key ID: `your-access-key`
- Secret Access Key: `your-secret-key`
- Endpoint: `https://[account-id].r2.cloudflarestorage.com`

### 2.5 Configure CORS (Optional)

If you need browser access to R2:

1. Go to your bucket → Settings → CORS policy
2. Add CORS rule:
```json
[
  {
    "AllowedOrigins": ["https://your-dashboard.vercel.app"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### 2.6 Test R2 Connection

```bash
# Install AWS CLI (R2 is S3-compatible)
pip install awscli

# Configure AWS CLI for R2
aws configure
# AWS Access Key ID: [your R2 access key]
# AWS Secret Access Key: [your R2 secret key]
# Default region name: auto
# Default output format: json

# Test upload
echo "test" > test.txt
aws s3 cp test.txt s3://neurotrace-models/test.txt \
  --endpoint-url https://[account-id].r2.cloudflarestorage.com

# Test download
aws s3 cp s3://neurotrace-models/test.txt downloaded.txt \
  --endpoint-url https://[account-id].r2.cloudflarestorage.com

# Clean up
rm test.txt downloaded.txt
aws s3 rm s3://neurotrace-models/test.txt \
  --endpoint-url https://[account-id].r2.cloudflarestorage.com
```

## 3. Supabase Auth Setup

Supabase provides authentication with OAuth 2.0, JWT, and RBAC.

### 3.1 Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub account
3. Verify your email address

### 3.2 Create New Project

1. Click "New project"
2. Organization: Create new or select existing
3. Project name: `neurotrace`
4. Database password: Generate strong password (save it!)
5. Region: Choose closest to your users
6. Pricing plan: Free tier
7. Click "Create new project"

**Free Tier Limits:**
- 50,000 monthly active users (MAU)
- 500MB database storage
- 1GB file storage
- 2GB bandwidth

### 3.3 Configure Authentication

1. Go to "Authentication" → "Providers"
2. Enable Email provider:
   - Toggle "Enable Email provider"
   - Enable "Confirm email" (recommended)
   - Set "Minimum password length" to 8
3. (Optional) Enable OAuth providers:
   - Google, Apple, etc. for social login

### 3.4 Set Up User Roles

1. Go to "Authentication" → "Policies"
2. Create custom claims for roles:

```sql
-- Run in SQL Editor
CREATE TYPE user_role AS ENUM ('patient', 'caregiver', 'clinician', 'admin');

ALTER TABLE auth.users ADD COLUMN role user_role DEFAULT 'patient';
```

### 3.5 Get API Credentials

1. Go to "Settings" → "API"
2. Copy the following:
   - **Project URL**: `https://your-project.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

**Security Note:** 
- `anon` key is safe for client-side use
- `service_role` key should ONLY be used server-side (has admin privileges)

### 3.6 Configure Row Level Security (RLS)

Enable RLS for data protection:

```sql
-- Run in SQL Editor
-- Example: Patients can only read their own data
CREATE POLICY "Patients can view own data"
  ON public.patients
  FOR SELECT
  USING (auth.uid() = id);

-- Clinicians can view assigned patients
CREATE POLICY "Clinicians can view assigned patients"
  ON public.patients
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'clinician' AND
    assigned_clinician = auth.uid()
  );
```

### 3.7 Test Authentication

```bash
# Install Supabase CLI
npm install -g supabase

# Test signup
curl -X POST 'https://your-project.supabase.co/auth/v1/signup' \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'

# Test login
curl -X POST 'https://your-project.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

## 4. Firebase Cloud Messaging Setup

Firebase Cloud Messaging (FCM) provides push notifications for mobile apps.

### 4.1 Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Add project"
3. Project name: `neurotrace`
4. Disable Google Analytics (optional for this use case)
5. Click "Create project"

### 4.2 Add iOS App

1. In Firebase console, click "Add app" → iOS
2. iOS bundle ID: `com.neurotrace.mobile` (must match your app)
3. App nickname: `NeuroTrace Mobile`
4. Download `GoogleService-Info.plist`
5. Add to `apps/mobile/ios/` directory
6. Follow the setup instructions to add Firebase SDK

### 4.3 Add Android App

1. In Firebase console, click "Add app" → Android
2. Android package name: `com.neurotrace.mobile` (must match your app)
3. App nickname: `NeuroTrace Mobile`
4. Download `google-services.json`
5. Add to `apps/mobile/android/app/` directory
6. Follow the setup instructions to add Firebase SDK

### 4.4 Enable Cloud Messaging

1. Go to "Project settings" → "Cloud Messaging"
2. Under "Cloud Messaging API (Legacy)", note the "Server key"
3. Copy the **Server key** (starts with `AAAA...`)

**Important:** Firebase Cloud Messaging is completely free with unlimited notifications.

### 4.5 Configure APNs (iOS Only)

For iOS push notifications, you need an Apple Push Notification service (APNs) certificate:

1. Go to [developer.apple.com](https://developer.apple.com)
2. Certificates, Identifiers & Profiles → Keys
3. Create a new key with "Apple Push Notifications service (APNs)" enabled
4. Download the `.p8` key file
5. In Firebase console, go to Project settings → Cloud Messaging → iOS app configuration
6. Upload the APNs authentication key:
   - Key ID: From Apple Developer
   - Team ID: Your Apple Developer Team ID
   - Upload the `.p8` file

### 4.6 Test Push Notifications

#### Test from Firebase Console

1. Go to "Cloud Messaging" → "Send your first message"
2. Notification title: "Test"
3. Notification text: "This is a test notification"
4. Target: Select your test device
5. Click "Send test message"

#### Test from Backend

```typescript
// Example: Send notification from Node.js
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

await admin.messaging().send({
  token: deviceToken,
  notification: {
    title: 'Alert: Sustained Trend Detected',
    body: 'Speech metrics have deviated for 3 consecutive days.',
  },
  data: {
    alertId: 'alert-123',
    severity: 'HIGH',
  },
});
```

## 5. GitHub Secrets Configuration

For CI/CD to work, add these secrets to your GitHub repository:

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"

Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `RAILWAY_TOKEN` | From Railway dashboard | For automated deployments |
| `SNYK_TOKEN` | From snyk.io | For security scanning |
| `CODECOV_TOKEN` | From codecov.io | For coverage reporting |

### Get Railway Token

```bash
# Login to Railway CLI
railway login

# Generate token
railway whoami --token
```

### Get Snyk Token

1. Sign up at [snyk.io](https://snyk.io)
2. Go to Account settings → API Token
3. Click "Generate token"

### Get Codecov Token

1. Sign up at [codecov.io](https://codecov.io)
2. Add your GitHub repository
3. Copy the upload token

## 6. Verification Checklist

After completing all setups, verify each service:

### Railway
- [ ] Backend deployed successfully
- [ ] PostgreSQL database accessible
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Health endpoint returns 200 OK

### Cloudflare R2
- [ ] Bucket created
- [ ] API tokens generated
- [ ] Test upload/download successful
- [ ] CORS configured (if needed)

### Supabase
- [ ] Project created
- [ ] Email authentication enabled
- [ ] API keys copied
- [ ] RLS policies configured
- [ ] Test signup/login successful

### Firebase Cloud Messaging
- [ ] Project created
- [ ] iOS app added with APNs configured
- [ ] Android app added
- [ ] Server key copied
- [ ] Test notification sent successfully

### GitHub Actions
- [ ] Railway token added
- [ ] Snyk token added
- [ ] Codecov token added
- [ ] CI pipeline runs successfully

## 7. Cost Monitoring

Set up alerts to monitor usage and avoid unexpected charges:

### Railway
1. Go to Project settings → Usage
2. Set up email alerts at 80% of free tier limits

### Cloudflare R2
1. Go to R2 → Usage
2. Monitor storage and request counts
3. Set up Cloudflare notifications

### Supabase
1. Go to Settings → Usage
2. Monitor MAU and database size
3. Set up email alerts

## 8. Troubleshooting

### Railway Deployment Fails

**Issue:** Build fails with "Module not found"
```bash
# Solution: Ensure all dependencies are in package.json
cd apps/backend
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

**Issue:** Database connection fails
```bash
# Solution: Verify DATABASE_URL is correctly linked
railway variables
# Should show DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### Cloudflare R2 Access Denied

**Issue:** 403 Forbidden when accessing R2
```bash
# Solution: Verify API token has correct permissions
# Recreate token with "Object Read & Write" permissions
```

### Supabase Auth Errors

**Issue:** "Invalid API key"
```bash
# Solution: Verify you're using the correct key
# anon key for client-side, service_role for server-side
```

### Firebase Push Notifications Not Received

**Issue:** iOS notifications not working
```bash
# Solution: Verify APNs certificate is uploaded and valid
# Check that bundle ID matches exactly
```

**Issue:** Android notifications not working
```bash
# Solution: Verify google-services.json is in correct location
# Rebuild the app after adding the file
```

## 9. Next Steps

After completing infrastructure setup:

1. Update `.env` files with all credentials
2. Run database migrations: `npm run prisma:migrate`
3. Deploy backend: `railway up`
4. Test all API endpoints
5. Configure mobile apps with Firebase credentials
6. Test push notifications end-to-end
7. Set up monitoring dashboards in Grafana Cloud

## 10. Security Best Practices

- [ ] Never commit `.env` files to Git
- [ ] Rotate API keys every 90 days
- [ ] Use separate projects for staging and production
- [ ] Enable 2FA on all service accounts
- [ ] Regularly review access logs
- [ ] Set up automated security scanning
- [ ] Keep all dependencies up to date
- [ ] Monitor for unusual usage patterns

## Support

If you encounter issues:
- Railway: [railway.app/help](https://railway.app/help)
- Cloudflare: [community.cloudflare.com](https://community.cloudflare.com)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- Firebase: [firebase.google.com/support](https://firebase.google.com/support)
