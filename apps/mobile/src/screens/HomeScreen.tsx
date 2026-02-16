/**
 * HomeScreen - Main home screen for NeuroTrace Mobile App
 * 
 * This is a placeholder screen that will be expanded in later tasks.
 * Requirements: 3.1
 */

import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

function HomeScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>NeuroTrace</Text>
        <Text style={styles.subtitle}>AI-Powered Neurological Monitoring</Text>
        <Text style={styles.status}>✓ React Native with TypeScript</Text>
        <Text style={styles.status}>✓ React Navigation</Text>
        <Text style={styles.status}>✓ SQLCipher (Encrypted Storage)</Text>
        <Text style={styles.status}>✓ ONNX Runtime</Text>
        <Text style={styles.status}>✓ MediaPipe Face Mesh</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
    textAlign: 'center',
  },
  status: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    marginVertical: 4,
  },
});

export default HomeScreen;
