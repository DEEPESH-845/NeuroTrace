/**
 * ClinicalInfoScreen - Clinical information input
 * 
 * Collects clinical information including stroke date, type, discharge date,
 * assigned clinician, and hospital.
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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { onboardingOrchestrator } from '../../onboarding';

type ClinicalInfoScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ClinicalInfo'
>;

interface ClinicalInfoScreenProps {
  navigation: ClinicalInfoScreenNavigationProp;
}

/**
 * Clinical information screen component for onboarding
 */
function ClinicalInfoScreen({
  navigation,
}: ClinicalInfoScreenProps): React.JSX.Element {
  const [strokeDate, setStrokeDate] = useState('');
  const [strokeType, setStrokeType] = useState('');
  const [dischargeDate, setDischargeDate] = useState('');
  const [clinicianName, setClinicianName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const strokeTypes = ['Ischemic', 'Hemorrhagic', 'TIA', 'Other'];

  const handleNext = () => {
    // Validate using orchestrator
    const validation = onboardingOrchestrator.validateClinicalInfo({
      strokeDate,
      strokeType,
      dischargeDate,
      clinicianName,
      hospitalName,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Save clinical info data to orchestrator
    onboardingOrchestrator.saveClinicalInfo({
      strokeDate,
      strokeType,
      dischargeDate,
      clinicianName,
      hospitalName,
    });

    // Navigate to next step
    navigation.navigate('AssessmentPreferences');
  };

  const handleBack = () => {
    navigation.goBack();
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
              <View style={[styles.progressFill, { width: '40%' }]} />
            </View>
            <Text style={styles.progressText}>Step 2 of 5</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Clinical Information</Text>
            <Text style={styles.subtitle}>
              Help us understand your recovery journey
            </Text>
          </View>

          {/* Stroke Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stroke Date</Text>
            <TextInput
              style={[
                styles.input,
                errors.strokeDate ? styles.inputError : undefined,
              ]}
              value={strokeDate}
              onChangeText={setStrokeDate}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={10}
              autoCapitalize="none"
            />
            {errors.strokeDate && (
              <Text style={styles.errorText}>{errors.strokeDate}</Text>
            )}
          </View>

          {/* Stroke Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stroke Type</Text>
            <View style={styles.optionsContainer}>
              {strokeTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    strokeType === type && styles.optionButtonSelected,
                  ]}
                  onPress={() => setStrokeType(type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      strokeType === type && styles.optionTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.strokeType && (
              <Text style={styles.errorText}>{errors.strokeType}</Text>
            )}
          </View>

          {/* Discharge Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hospital Discharge Date</Text>
            <TextInput
              style={[
                styles.input,
                errors.dischargeDate ? styles.inputError : undefined,
              ]}
              value={dischargeDate}
              onChangeText={setDischargeDate}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={10}
              autoCapitalize="none"
            />
            {errors.dischargeDate && (
              <Text style={styles.errorText}>{errors.dischargeDate}</Text>
            )}
          </View>

          {/* Clinician Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assigned Clinician</Text>
            <TextInput
              style={[
                styles.input,
                errors.clinicianName ? styles.inputError : undefined,
              ]}
              value={clinicianName}
              onChangeText={setClinicianName}
              placeholder="Dr. Smith"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />
            {errors.clinicianName && (
              <Text style={styles.errorText}>{errors.clinicianName}</Text>
            )}
          </View>

          {/* Hospital Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hospital Name</Text>
            <TextInput
              style={[
                styles.input,
                errors.hospitalName ? styles.inputError : undefined,
              ]}
              value={hospitalName}
              onChangeText={setHospitalName}
              placeholder="General Hospital"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />
            {errors.hospitalName && (
              <Text style={styles.errorText}>{errors.hospitalName}</Text>
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
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: '#1E293B',
    minHeight: 56,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginTop: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  optionText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#1E3A8A',
    fontWeight: '600',
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

export default ClinicalInfoScreen;
