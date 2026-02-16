# NeuroTrace Mobile App Setup

## Overview

This document describes the React Native mobile app setup for NeuroTrace, including all configured dependencies and their purposes.

## Technology Stack

### Core Framework
- **React Native 0.73.11**: Cross-platform mobile framework
- **TypeScript 5.3.3**: Type-safe JavaScript with strict mode enabled
- **React 18.2.0**: UI library

### Navigation
- **@react-navigation/native 6.1.9**: Navigation framework
- **@react-navigation/stack 6.3.20**: Stack-based navigation
- **react-native-gesture-handler 2.14.1**: Gesture handling for navigation
- **react-native-reanimated 3.6.1**: Smooth animations
- **react-native-screens 3.29.0**: Native screen optimization
- **react-native-safe-area-context 4.8.2**: Safe area handling

### On-Device AI
- **onnxruntime-react-native 1.17.0**: ONNX Runtime for speech processing (Phi-3-Mini model)
- **@mediapipe/tasks-vision 0.10.32**: MediaPipe for facial asymmetry detection

### Encrypted Local Storage
- **react-native-quick-sqlite 5.0.0**: SQLCipher-based encrypted database (AES-256)
- **react-native-fs 2.20.0**: File system access for model storage

### Camera & Media
- **react-native-vision-camera 3.8.2**: High-performance camera for facial analysis

### Push Notifications
- **@react-native-firebase/app 19.0.1**: Firebase core
- **@react-native-firebase/messaging 19.0.1**: Firebase Cloud Messaging for push notifications

### Validation & Types
- **zod 3.22.4**: Runtime type validation
- **@neurotrace/types 1.0.0**: Shared TypeScript types

### Testing
- **jest 29.7.0**: Testing framework
- **@testing-library/react-native 12.4.3**: React Native testing utilities
- **fast-check 3.15.1**: Property-based testing library
- **react-test-renderer 18.2.0**: React component testing

## TypeScript Configuration

The app uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "esnext",
    "lib": ["esnext"],
    "jsx": "react-native",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

## Project Structure

```
apps/mobile/
├── src/
│   ├── ai/                          # On-device AI modules
│   │   ├── FacialAsymmetryDetector.ts   # MediaPipe facial analysis
│   │   └── ONNXRuntimeManager.ts        # ONNX Runtime for speech
│   ├── database/                    # SQLCipher encrypted storage
│   │   ├── schema.ts                    # Database schema
│   │   ├── LocalStorageManager.ts       # Storage operations
│   │   └── SyncManager.ts               # Offline sync
│   ├── navigation/                  # React Navigation setup
│   │   └── AppNavigator.tsx             # Main navigator
│   ├── screens/                     # App screens
│   │   └── HomeScreen.tsx               # Home screen
│   └── App.tsx                      # Main app component
├── __tests__/                       # Test files
├── android/                         # Android native code
├── ios/                             # iOS native code
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
└── jest.config.js                   # Jest config
```

## Key Features Configured

### 1. React Navigation
- Stack-based navigation with TypeScript type safety
- Custom header styling
- Gesture handling enabled

### 2. SQLCipher Encrypted Storage
- AES-256 encryption at rest
- Schema defined for patients, assessments, baselines, alerts
- Automatic data pruning (30-day retention)
- Offline sync queue

### 3. ONNX Runtime
- Configured for on-device speech processing
- CPU execution provider (GPU can be added)
- Graph optimization enabled
- Singleton pattern for resource management

### 4. MediaPipe Face Mesh
- 468 facial landmarks detection
- GPU acceleration when available
- Facial asymmetry scoring
- Eye openness, mouth symmetry, eyebrow symmetry metrics

### 5. Firebase Cloud Messaging
- Push notifications for alerts
- Background message handling
- iOS and Android support

## Privacy & Security

All sensitive data processing follows privacy-first principles:

1. **On-Device Processing**: All raw biometric data (voice, facial images) processed locally
2. **No Raw Data Transmission**: Only derived metrics sent to cloud
3. **Encrypted Storage**: SQLCipher with AES-256 encryption
4. **Automatic Data Deletion**: Raw biometric data deleted after processing (≤5 seconds)
5. **TLS 1.3**: All network communication encrypted

## Requirements Satisfied

This setup satisfies the following requirements:

- **Requirement 2.1**: Daily multimodal assessment execution
- **Requirement 6.5**: Local database encryption (AES-256 via SQLCipher)
- **Requirement 6.6**: SQLCipher for encrypted storage
- **Requirement 6.1**: On-device voice processing (ONNX Runtime)
- **Requirement 6.2**: On-device facial processing (MediaPipe)
- **Requirement 10.2**: On-device AI processing within 5 seconds

## Running the App

### Development
```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run property-based tests only
npm run test:property

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Next Steps

The following features will be implemented in subsequent tasks:

1. **Task 3.2**: Local storage manager implementation
2. **Task 4.1-4.2**: Patient onboarding flow
3. **Task 6.1-6.3**: Speech biomarker extraction
4. **Task 7.1-7.2**: Facial asymmetry detection (already implemented)
5. **Task 8.1-8.2**: Reaction time measurement
6. **Task 9.1-9.5**: Assessment orchestration

## Notes

- **Model Files**: ONNX models and MediaPipe models need to be downloaded and placed in appropriate directories
- **Firebase Setup**: Firebase configuration files (google-services.json for Android, GoogleService-Info.plist for iOS) need to be added
- **Native Dependencies**: Some dependencies require native linking (handled automatically by React Native 0.73+)
- **iOS Permissions**: Camera and microphone permissions need to be configured in Info.plist
- **Android Permissions**: Camera, microphone, and notification permissions need to be configured in AndroidManifest.xml
