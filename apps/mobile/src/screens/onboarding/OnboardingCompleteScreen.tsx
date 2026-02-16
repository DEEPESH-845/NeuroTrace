/**
 * OnboardingCompleteScreen - Onboarding completion screen
 * 
 * Displays completion message and explains next steps for baseline establishment.
 * Requirements: 1.1, 1.3, 13.2, 13.4
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

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
  const handleGetStarted = () => {
    // TODO: Navigate to home screen or first assessment
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.progressText}>Complete!</Text>
          </View>

          {/* Success Icon */}
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✓</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>
              Welcome to your recovery journey with NeuroTrace
            </Text>
          </View>

          {/* Next Steps */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What Happens Next?</Text>

            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Baseline Period (7 Days)</Text>
                <Text style={styles.stepText}>
                  Complete daily 60-second assessments to establish your
                  personal baseline. This helps us understand what's normal for
                  you.
                </Text>
              </View>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Daily Monitoring</Text>
                <Text style={styles.stepText}>
                  After your baseline is set, we'll monitor for changes and
                  alert your caregiver if we detect anything concerning.
                </Text>
              </View>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Stay Consistent</Text>
                <Text style={styles.stepText}>
                  Complete assessments at your scheduled time each day. Missing
                  more than 2 assessments will extend your baseline period.
                </Text>
              </View>
            </View>
          </View>

          {/* Reminder Notice */}
          <View style={styles.reminderNotice}>
            <Text style={styles.reminderText}>
              🔔 You'll receive a daily reminder at your chosen time. Each
              assessment takes just 60 seconds!
            </Text>
          </View>

          {/* Privacy Reminder */}
          <View style={styles.privacyReminder}>
            <Text style={styles.privacyText}>
              🔒 Remember: All processing happens on your device. Your privacy
              is protected.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Get Started Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Start My First Assessment</Text>
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
    backgroundColor: '#10B981',
  },
  progressText: {
    fontSize: 18,
    color: '#10B981',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 20,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A8A',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#334155',
  },
  reminderNotice: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  reminderText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#1E3A8A',
  },
  privacyReminder: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  privacyText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#065F46',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default OnboardingCompleteScreen;
