/**
 * OnboardingCompleteScreen - Final onboarding screen
 * 
 * Completes the onboarding process by saving the patient profile
 * and scheduling daily assessment reminders.
 * Requirements: 1.1, 1.2
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { onboardingOrchestrator } from '../../onboarding';

type OnboardingCompleteScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OnboardingComplete'
>;

interface OnboardingCompleteScreenProps {
  navigation: OnboardingCompleteScreenNavigationProp;
}

/**
 * Onboarding complete screen component
 */
function OnboardingCompleteScreen({
  navigation,
}: OnboardingCompleteScreenProps): React.JSX.Element {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    // Auto-complete onboarding when screen loads
    completeOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeOnboarding = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Complete onboarding and save patient profile
      const newPatientId = await onboardingOrchestrator.completeOnboarding();
      setPatientId(newPatientId);
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
      setIsProcessing(false);
    }
  };

  const handleGetStarted = () => {
    // Navigate to home screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const handleRetry = () => {
    completeOnboarding();
  };

  if (isProcessing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.processingText}>Setting up your account...</Text>
          <Text style={styles.processingSubtext}>
            This will only take a moment
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
        <View style={styles.content}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Setup Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>You&apos;re All Set!</Text>
          <Text style={styles.subtitle}>
            Your NeuroTrace account is ready
          </Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardIcon}>📅</Text>
            <Text style={styles.infoCardTitle}>Daily Assessments</Text>
            <Text style={styles.infoCardText}>
              Complete a quick 60-second assessment each day
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardIcon}>📊</Text>
            <Text style={styles.infoCardTitle}>Track Your Progress</Text>
            <Text style={styles.infoCardText}>
              Monitor your recovery over the next 90 days
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardIcon}>🔔</Text>
            <Text style={styles.infoCardTitle}>Stay Informed</Text>
            <Text style={styles.infoCardText}>
              Get alerts if we detect any changes
            </Text>
          </View>
        </View>

        {/* Patient ID (for reference) */}
        {patientId && (
          <View style={styles.patientIdContainer}>
            <Text style={styles.patientIdLabel}>Your Patient ID:</Text>
            <Text style={styles.patientIdText}>{patientId.slice(0, 8)}</Text>
          </View>
        )}
      </View>

      {/* Get Started Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successIconText: {
    fontSize: 60,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  errorIconText: {
    fontSize: 60,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#64748B',
    textAlign: 'center',
  },
  processingText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1E3A8A',
    marginTop: 24,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 18,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  infoCards: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  infoCardIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoCardText: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  patientIdContainer: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  patientIdLabel: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 4,
  },
  patientIdText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E3A8A',
    fontFamily: 'monospace',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  getStartedButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default OnboardingCompleteScreen;
