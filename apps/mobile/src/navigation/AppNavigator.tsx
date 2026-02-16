/**
 * AppNavigator - Main navigation structure for NeuroTrace Mobile App
 * 
 * Sets up React Navigation with stack navigator for the app's screens.
 * Requirements: 3.1
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import DemographicsScreen from '../screens/onboarding/DemographicsScreen';
import ClinicalInfoScreen from '../screens/onboarding/ClinicalInfoScreen';
import AssessmentPreferencesScreen from '../screens/onboarding/AssessmentPreferencesScreen';
import CaregiverInvitationScreen from '../screens/onboarding/CaregiverInvitationScreen';
import OnboardingCompleteScreen from '../screens/onboarding/OnboardingCompleteScreen';

export type RootStackParamList = {
  Home: undefined;
  Welcome: undefined;
  Demographics: undefined;
  ClinicalInfo: undefined;
  AssessmentPreferences: undefined;
  CaregiverInvitation: undefined;
  OnboardingComplete: undefined;
  Assessment: undefined;
  Results: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

/**
 * Main app navigator component
 */
export function AppNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1E3A8A',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        }}
      >
        {/* Onboarding Flow */}
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ title: 'Welcome', headerShown: false }}
        />
        <Stack.Screen
          name="Demographics"
          component={DemographicsScreen}
          options={{ title: 'About You' }}
        />
        <Stack.Screen
          name="ClinicalInfo"
          component={ClinicalInfoScreen}
          options={{ title: 'Clinical Information' }}
        />
        <Stack.Screen
          name="AssessmentPreferences"
          component={AssessmentPreferencesScreen}
          options={{ title: 'Assessment Time' }}
        />
        <Stack.Screen
          name="CaregiverInvitation"
          component={CaregiverInvitationScreen}
          options={{ title: 'Connect Caregiver' }}
        />
        <Stack.Screen
          name="OnboardingComplete"
          component={OnboardingCompleteScreen}
          options={{ title: 'Complete', headerShown: false }}
        />

        {/* Main App Screens */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'NeuroTrace' }}
        />
        {/* Additional screens will be added in later tasks */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
