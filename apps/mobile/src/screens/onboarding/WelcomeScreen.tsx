/**
 * WelcomeScreen - Initial onboarding screen
 * 
 * Displays welcome message and introduces the 5-minute guided onboarding flow.
 * Requirements: 1.1, 13.2, 13.4
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

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavigationProp;
}

/**
 * Welcome screen component for onboarding
 */
function WelcomeScreen({ navigation }: WelcomeScreenProps): React.JSX.Element {
  const handleGetStarted = () => {
    navigation.navigate('Demographics');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to NeuroTrace</Text>
            <Text style={styles.subtitle}>
              Your AI-powered recovery companion
            </Text>
          </View>

          {/* Introduction */}
          <View style={styles.section}>
            <Text style={styles.bodyText}>
              NeuroTrace helps monitor your recovery after stroke through quick
              daily assessments.
            </Text>
          </View>

          {/* What to Expect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What to Expect</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                5-minute setup to personalize your experience
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                60-second daily assessments at your preferred time
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Automatic alerts to your caregiver if changes are detected
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Complete privacy - all processing happens on your device
              </Text>
            </View>
          </View>

          {/* Privacy Notice */}
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyText}>
              🔒 Your voice and facial data never leave your device. Only
              anonymous health metrics are shared with your care team.
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
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>Takes about 5 minutes</Text>
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  bodyText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#334155',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 18,
    color: '#1E3A8A',
    marginRight: 12,
    fontWeight: 'bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    color: '#334155',
  },
  privacyNotice: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A8A',
    marginTop: 8,
  },
  privacyText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#1E3A8A',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  button: {
    backgroundColor: '#1E3A8A',
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
  footerText: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default WelcomeScreen;
