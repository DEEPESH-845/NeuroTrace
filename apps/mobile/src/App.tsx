/**
 * NeuroTrace Mobile App - Main Entry Point
 * 
 * React Native app with TypeScript, React Navigation, SQLCipher,
 * ONNX Runtime, and MediaPipe for on-device AI processing.
 * 
 * Requirements: 2.1, 6.5, 6.6
 */

import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { offlineManager } from './database/OfflineManager';
import { notificationManager } from './services/NotificationManager';
// import { NetInfo } from 'react-native'; // Note: In real app, this would be @react-native-community/netinfo

// Mock NetInfo for now since we don't have the package installed in this environment
// In a real React Native app, we would use NetInfo.addEventListener
/*
const MockNetInfo = {
  addEventListener: (callback: (state: any) => void) => {
    // Mock online state
    callback({ isConnected: true });
    return () => {};
  }
};
*/

function App(): React.JSX.Element {
  useEffect(() => {
    // Start offline monitoring
    offlineManager.startMonitoring((alert) => {
      notificationManager.showOfflineAlert(alert);
    });

    // In a real app, we would subscribe to NetInfo here
    // const unsubscribe = NetInfo.addEventListener(state => {
    //   offlineManager.updateConnectivity(state.isConnected ?? false);
    // });
    
    // For this environment, we just start monitoring. 
    // The OfflineManager default assumes online, so it won't trigger unless updated.
    
    return () => {
      offlineManager.stopMonitoring();
      // unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

export default App;
