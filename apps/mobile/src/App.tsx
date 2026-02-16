/**
 * NeuroTrace Mobile App - Main Entry Point
 * 
 * React Native app with TypeScript, React Navigation, SQLCipher,
 * ONNX Runtime, and MediaPipe for on-device AI processing.
 * 
 * Requirements: 2.1, 6.5, 6.6
 */

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

export default App;
