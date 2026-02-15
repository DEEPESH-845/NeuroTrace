# NeuroTrace Development Environment Setup

This guide will help you set up the complete NeuroTrace development environment.

## Prerequisites

### Required Software

1. **Node.js 18+** and **npm 9+**
   ```bash
   node --version  # Should be v18.0.0 or higher
   npm --version   # Should be 9.0.0 or higher
   ```

2. **PostgreSQL 15+** (for local development)
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@15
   brew services start postgresql@15

   # Ubuntu/Debian
   sudo apt-get install postgresql-15

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

3. **Git**
   ```bash
   git --version
   ```

### For Mobile Development

4. **React Native Development Environment**

   **iOS (macOS only):**
   - Xcode 14+ from App Store
   - Xcode Command Line Tools:
     ```bash
     xcode-select --install
     ```
   - CocoaPods:
     ```bash
     sudo gem install cocoapods
     ```

   **Android:**
   - Android Studio with SDK 33+
   - Set ANDROID_HOME environment variable:
     ```bash
     # Add to ~/.bashrc or ~/.zshrc
     export ANDROID_HOME=$HOME/Library/Android/sdk
     export PATH=$PATH:$ANDROID_HOME/emulator
     export PATH=$PATH:$ANDROID_HOME/tools
     export PATH=$PATH:$ANDROID_HOME/tools/bin
     export PATH=$PATH:$ANDROID_HOME/platform-tools
     ```

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/neurotrace.git
cd neurotrace
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

This will install dependencies for:
- Root workspace
- `packages/types` (shared types)
- `apps/backend` (Node.js API)
- `apps/mobile` (React Native app)

### 3. Set Up Environment Variables

#### Backend Environment

```bash
cd apps/backend
cp .env.example .env
```

Edit `apps/backend/.env` with your credentials:

```env
# Database (local PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/neurotrace?schema=public"

# Supabase Auth (sign up at https://supabase.com)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Cloudflare R2 (sign up at https://cloudflare.com)
CLOUDFLARE_R2_ACCESS_KEY="your-access-key"
CLOUDFLARE_R2_SECRET_KEY="your-secret-key"
CLOUDFLARE_R2_BUCKET="neurotrace-models"
CLOUDFLARE_R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"

# Twilio (sign up at https://twilio.com)
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Firebase Cloud Messaging (create project at https://console.firebase.google.com)
FCM_SERVER_KEY="your-fcm-server-key"

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY="your-256-bit-encryption-key-in-hex"

# Server
PORT=3000
NODE_ENV="development"
```

### 4. Set Up Database

```bash
cd apps/backend

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### 5. Build Shared Types Package

```bash
cd packages/types
npm run build
```

## Running the Applications

### Backend API

```bash
# From root directory
npm run backend

# Or from apps/backend
cd apps/backend
npm run dev
```

The API will be available at `http://localhost:3000`

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

### Mobile App

#### iOS

```bash
# From root directory
npm run mobile

# In the Metro bundler terminal, press 'i' for iOS
```

Or manually:
```bash
cd apps/mobile
npm run ios
```

#### Android

```bash
# From root directory
npm run mobile

# In the Metro bundler terminal, press 'a' for Android
```

Or manually:
```bash
cd apps/mobile
npm run android
```

## Testing

### Run All Tests

```bash
# From root directory
npm test
```

### Run Tests by Type

```bash
# Unit tests only
npm run test:unit

# Property-based tests only
npm run test:property

# With coverage
npm test -- --coverage
```

### Run Tests for Specific Package

```bash
# Backend tests
cd apps/backend
npm test

# Types tests
cd packages/types
npm test
```

## Code Quality

### Linting

```bash
# Lint all code
npm run lint

# Lint specific package
cd apps/backend
npm run lint
```

### Formatting

```bash
# Format all code
npm run format
```

### Type Checking

```bash
# Type check all code
npm run typecheck

# Type check specific package
cd apps/backend
npm run typecheck
```

## Troubleshooting

### PostgreSQL Connection Issues

If you get database connection errors:

1. Check PostgreSQL is running:
   ```bash
   # macOS
   brew services list | grep postgresql

   # Linux
   sudo systemctl status postgresql
   ```

2. Verify connection string in `.env`:
   ```bash
   psql "postgresql://postgres:postgres@localhost:5432/neurotrace"
   ```

3. Create database if it doesn't exist:
   ```bash
   createdb neurotrace
   ```

### React Native Build Issues

#### iOS

1. Clean build:
   ```bash
   cd apps/mobile/ios
   rm -rf Pods Podfile.lock
   pod install
   ```

2. Clean Xcode derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

#### Android

1. Clean build:
   ```bash
   cd apps/mobile/android
   ./gradlew clean
   ```

2. Clear cache:
   ```bash
   cd apps/mobile
   npm start -- --reset-cache
   ```

### Node Modules Issues

If you encounter dependency issues:

```bash
# Clean all node_modules
npm run clean

# Reinstall
npm install
```

## Next Steps

1. **Read the Architecture**: See [README.md](README.md) for system architecture
2. **Review Requirements**: See `.kiro/specs/neurotrace-monitoring-system/requirements.md`
3. **Review Design**: See `.kiro/specs/neurotrace-monitoring-system/design.md`
4. **Check Tasks**: See `.kiro/specs/neurotrace-monitoring-system/tasks.md`

## Getting Help

- **Documentation**: See `docs/` directory
- **Issues**: Create an issue on GitHub
- **Slack**: Join our development channel
- **Email**: dev@neurotrace.com
