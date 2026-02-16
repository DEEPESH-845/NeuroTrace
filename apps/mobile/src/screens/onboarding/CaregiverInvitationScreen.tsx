/**
 * CaregiverInvitationScreen - Caregiver invitation code entry
 * 
 * Allows patient to enter invitation code to link with caregiver account.
 * Requirements: 1.1, 13.2, 13.4
 */

import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { onboardingOrchestrator } from '../../onboarding';

type CaregiverInvitationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CaregiverInvitation'
>;

interface CaregiverInvitationScreenProps {
  navigation: CaregiverInvitationScreenNavigationProp;
}

/**
 * Caregiver invitation screen component for onboarding
 */
function CaregiverInvitationScreen({
  navigation,
}: CaregiverInvitationScreenProps): React.JSX.Element {
  const [invitationCode, setInvitationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateCode = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Invitation code format: 6 alphanumeric characters
    const codeRegex = /^[A-Z0-9]{6}$/;

    if (invitationCode && !codeRegex.test(invitationCode.toUpperCase())) {
      newErrors.invitationCode =
        'Code must be 6 characters (letters and numbers)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerifyCode = async () => {
    if (!validateCode()) {
      return;
    }

    setIsVerifying(true);
    setErrors({});

    try {
      // TODO: Verify invitation code with backend
      // Simulate API call
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));

      // Save caregiver code to orchestrator
      onboardingOrchestrator.saveCaregiverCode(invitationCode);

      // For now, accept any valid format code
      // In production, this would validate against backend
      navigation.navigate('OnboardingComplete');
    } catch (error) {
      setErrors({
        invitationCode: 'Invalid or expired invitation code',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    // Save undefined caregiver code (skipped)
    onboardingOrchestrator.saveCaregiverCode(undefined);
    
    // Allow skipping caregiver setup
    navigation.navigate('OnboardingComplete');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatInvitationCode = (text: string): string => {
    // Convert to uppercase and limit to 6 characters
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '80%' }]} />
            </View>
            <Text style={styles.progressText}>Step 4 of 5</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Connect with Caregiver</Text>
            <Text style={styles.subtitle}>
              Link your account with a caregiver who will receive alerts
            </Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What is a caregiver?</Text>
            <Text style={styles.infoText}>
              A caregiver is a family member or friend who will receive
              notifications if the app detects changes in your condition. They
              can help coordinate your care.
            </Text>
          </View>

          {/* Invitation Code Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Invitation Code</Text>
            <Text style={styles.helperText}>
              Ask your caregiver to share their 6-character code
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.invitationCode ? styles.inputError : undefined,
              ]}
              value={invitationCode}
              onChangeText={(text) =>
                setInvitationCode(formatInvitationCode(text))
              }
              placeholder="ABC123"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              maxLength={6}
              editable={!isVerifying}
            />
            {errors.invitationCode && (
              <Text style={styles.errorText}>{errors.invitationCode}</Text>
            )}
          </View>

          {/* Verify Button */}
          {invitationCode.length === 6 && (
            <TouchableOpacity
              style={[
                styles.verifyButton,
                isVerifying && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyCode}
              disabled={isVerifying}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Skip Option */}
          <View style={styles.skipContainer}>
            <Text style={styles.skipText}>Don&apos;t have a code?</Text>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipLink}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          {/* Additional Info */}
          <View style={styles.additionalInfo}>
            <Text style={styles.additionalInfoText}>
              You can add a caregiver later from the app settings.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
          disabled={isVerifying}
        >
          <Text style={styles.backButtonText}>Back</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E3A8A',
  },
  progressText: {
    fontSize: 18,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    lineHeight: 26,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A8A',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#334155',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    color: '#1E293B',
    minHeight: 56,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 4,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  skipContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  skipText: {
    fontSize: 18,
    color: '#64748B',
  },
  skipLink: {
    fontSize: 18,
    color: '#1E3A8A',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  additionalInfo: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  additionalInfoText: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  backButton: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default CaregiverInvitationScreen;
