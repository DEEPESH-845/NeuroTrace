/**
 * AssessmentPreferencesScreen - Assessment time preference selector
 * 
 * Allows patient to select preferred assessment time with timezone support.
 * Requirements: 1.2, 13.2, 13.4
 */

import React, { useState, useEffect } from 'react';
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

type AssessmentPreferencesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AssessmentPreferences'
>;

interface AssessmentPreferencesScreenProps {
  navigation: AssessmentPreferencesScreenNavigationProp;
}

/**
 * Assessment preferences screen component for onboarding
 */
function AssessmentPreferencesScreen({
  navigation,
}: AssessmentPreferencesScreenProps): React.JSX.Element {
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [timezone, setTimezone] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Common US timezones
  const timezones = [
    'America/New_York (Eastern)',
    'America/Chicago (Central)',
    'America/Denver (Mountain)',
    'America/Los_Angeles (Pacific)',
    'America/Anchorage (Alaska)',
    'Pacific/Honolulu (Hawaii)',
  ];

  // Generate hour options (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate minute options (0, 15, 30, 45)
  const minutes = [0, 15, 30, 45];

  useEffect(() => {
    // Set default timezone based on device
    // In a real app, this would use a timezone detection library
    if (!timezone) {
      setTimezone(timezones[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!timezone) {
      newErrors.timezone = 'Please select a timezone';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      // TODO: Save assessment preferences
      navigation.navigate('CaregiverInvitation');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatTime = (): string => {
    const hour = selectedHour.toString().padStart(2, '0');
    const minute = selectedMinute.toString().padStart(2, '0');
    return `${hour}:${minute} ${selectedPeriod}`;
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
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
            <Text style={styles.progressText}>Step 3 of 5</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Daily Assessment Time</Text>
            <Text style={styles.subtitle}>
              Choose a time that works best for you
            </Text>
          </View>

          {/* Time Display */}
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{formatTime()}</Text>
            <Text style={styles.timeSubtext}>
              You&apos;ll receive a reminder at this time each day
            </Text>
          </View>

          {/* Hour Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hour</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContainer}
            >
              {hours.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[
                    styles.timeButton,
                    selectedHour === hour && styles.timeButtonSelected,
                  ]}
                  onPress={() => setSelectedHour(hour)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeButtonText,
                      selectedHour === hour && styles.timeButtonTextSelected,
                    ]}
                  >
                    {hour}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Minute Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Minute</Text>
            <View style={styles.minuteContainer}>
              {minutes.map((minute) => (
                <TouchableOpacity
                  key={minute}
                  style={[
                    styles.minuteButton,
                    selectedMinute === minute && styles.minuteButtonSelected,
                  ]}
                  onPress={() => setSelectedMinute(minute)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.minuteButtonText,
                      selectedMinute === minute &&
                        styles.minuteButtonTextSelected,
                    ]}
                  >
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* AM/PM Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Period</Text>
            <View style={styles.periodContainer}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'AM' && styles.periodButtonSelected,
                ]}
                onPress={() => setSelectedPeriod('AM')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 'AM' && styles.periodButtonTextSelected,
                  ]}
                >
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'PM' && styles.periodButtonSelected,
                ]}
                onPress={() => setSelectedPeriod('PM')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 'PM' && styles.periodButtonTextSelected,
                  ]}
                >
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Timezone Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Timezone</Text>
            <View style={styles.timezoneContainer}>
              {timezones.map((tz) => (
                <TouchableOpacity
                  key={tz}
                  style={[
                    styles.timezoneButton,
                    timezone === tz && styles.timezoneButtonSelected,
                  ]}
                  onPress={() => setTimezone(tz)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timezoneButtonText,
                      timezone === tz && styles.timezoneButtonTextSelected,
                    ]}
                  >
                    {tz}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.timezone && (
              <Text style={styles.errorText}>{errors.timezone}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Next</Text>
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
    marginBottom: 32,
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
  },
  timeDisplay: {
    backgroundColor: '#EFF6FF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#1E3A8A',
  },
  timeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  timeSubtext: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  scrollContainer: {
    gap: 12,
    paddingRight: 24,
  },
  timeButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  timeButtonText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '500',
  },
  timeButtonTextSelected: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  minuteContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  minuteButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  minuteButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  minuteButtonText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '500',
  },
  minuteButtonTextSelected: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  periodButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  periodButtonText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '600',
  },
  periodButtonTextSelected: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  timezoneContainer: {
    gap: 12,
  },
  timezoneButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  timezoneButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  timezoneButtonText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '500',
  },
  timezoneButtonTextSelected: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  backButton: {
    flex: 1,
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
  nextButton: {
    flex: 1,
    backgroundColor: '#1E3A8A',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default AssessmentPreferencesScreen;
