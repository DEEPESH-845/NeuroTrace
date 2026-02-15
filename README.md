# NeuroTrace Monitoring System

AI-powered neurological safety net for post-stroke patients during the critical 90-day recovery period.

## Project Structure

```
neurotrace-monorepo/
├── apps/
│   ├── mobile/          # React Native mobile app (iOS/Android)
│   ├── backend/         # Node.js/Express API on Railway
│   ├── dashboard/       # Clinician web dashboard (React)
│   ├── admin/           # Admin web dashboard (React)
│   └── caregiver/       # Caregiver mobile app (React Native)
├── packages/
│   └── types/           # Shared TypeScript types and validators
├── .github/
│   └── workflows/       # CI/CD pipelines
└── docs/                # Documentation
```

## Technology Stack

### Mobile Apps
- **Framework**: React Native with TypeScript
- **On-Device AI**: ONNX Runtime with Phi-3-Mini (3.8B parameters)
- **Computer Vision**: MediaPipe Face Mesh
- **Local Storage**: SQLCipher (AES-256 encryption)
- **Testing**: Jest + fast-check (property-based testing)

### Backend
- **Runtime**: Node.js 18+ with Express
- **Database**: PostgreSQL 15 on Railway
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Storage**: Cloudflare R2
- **Notifications**: Firebase Cloud Messaging
- **Testing**: Jest + Supertest + fast-check

### Web Dashboards
- **Framework**: React with TypeScript
- **Hosting**: Vercel
- **Charts**: Chart.js / Recharts
- **Testing**: Jest + React Testing Library

### Infrastructure
- **Backend Hosting**: Railway.app (free tier)
- **Database**: PostgreSQL on Railway (free tier)
- **Object Storage**: Cloudflare R2 (free tier)
- **CDN**: Cloudflare (free tier)
- **Monitoring**: Grafana Cloud + Prometheus (free tier)
- **CI/CD**: GitHub Actions (free tier)

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+ (for local development)
- React Native development environment (for mobile apps)
  - iOS: Xcode 14+
  - Android: Android Studio with SDK 33+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/neurotrace.git
cd neurotrace
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your credentials
```

4. Generate Prisma client:
```bash
cd apps/backend
npm run prisma:generate
```

5. Run database migrations:
```bash
npm run prisma:migrate
```

### Development

Run all services in development mode:

```bash
# Backend API
npm run backend

# Mobile app (iOS)
npm run mobile
# Then press 'i' for iOS or 'a' for Android

# Clinician dashboard
npm run dashboard

# Admin dashboard
npm run admin
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run property-based tests only
npm run test:property

# Run tests with coverage
npm test -- --coverage
```

### Linting and Formatting

```bash
# Lint all code
npm run lint

# Format all code
npm run format

# Type check all code
npm run typecheck
```

## Architecture

### Privacy-First Design

- **On-Device Processing**: All raw biometric data (voice, facial images) processed locally
- **Data Minimization**: Only derived metrics transmitted to cloud
- **Encryption**: AES-256 at rest (SQLCipher), TLS 1.3 in transit
- **Federated Learning**: Model improvements without centralizing patient data

### Key Features

1. **Daily Assessments**: 60-second multimodal evaluations (voice, facial, reaction time)
2. **Baseline Establishment**: Personalized neurological profile from first 7 days
3. **Deviation Detection**: 2 standard deviation threshold with 3-day trend filtering
4. **Alert System**: Multi-level alerts (Low, Medium, High) with caregiver/clinician notifications
5. **FHIR Integration**: EHR-compatible data export
6. **Offline Functionality**: Full assessment and detection capabilities without internet

## Deployment

### Railway (Backend)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Deploy:
```bash
railway up
```

### Vercel (Web Dashboards)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
cd apps/dashboard
vercel --prod
```

## Testing Strategy

### Property-Based Testing

All 52 correctness properties from the design document are tested using fast-check with minimum 100 iterations per test.

Example:
```typescript
// Property 1: Baseline Establishment
fc.assert(
  fc.property(
    fc.array(assessmentArbitrary(), { minLength: 5, maxLength: 7 }),
    (assessments) => {
      const baseline = computeBaseline(assessments);
      expect(baseline.speechMetrics).toBeDefined();
      expect(baseline.assessmentCount).toBeGreaterThanOrEqual(5);
    }
  ),
  { numRuns: 100 }
);
```

### Coverage Goals

- Overall: 80% minimum
- Critical paths: 95% minimum
- Security code: 100%

## Security

### HIPAA Compliance

- Encryption at rest (AES-256) and in transit (TLS 1.3)
- Role-based access control (RBAC)
- Audit logging (6-year retention)
- Business Associate Agreements (BAA) with all vendors

### Security Scanning

- SAST: SonarQube Community Edition
- DAST: OWASP ZAP
- Dependency scanning: npm audit + Snyk
- Container scanning: Trivy

## Cost Optimization

### Free Tier Limits

- Railway: 500GB bandwidth/month
- PostgreSQL: 1GB storage
- Cloudflare R2: 10GB storage, 1M requests/month
- Vercel: 100GB bandwidth/month
- Supabase Auth: 50K MAU
- Firebase Cloud Messaging: Unlimited
- GitHub Actions: 2000 minutes/month

### Estimated Costs

- 0-500 patients: $10-50/month
- 500-1,000 patients: $50-100/month
- 1,000-2,000 patients: $150-250/month

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@neurotrace.com or join our Slack channel.

## Acknowledgments

- Clinical validation team at [Hospital Name]
- Open-source contributors
- Stroke recovery community
