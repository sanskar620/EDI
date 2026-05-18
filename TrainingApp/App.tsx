import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const loadStoredAuth = useAuthStore(state => state.loadStoredAuth);
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Try to restore auth state from AsyncStorage
        await loadStoredAuth();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeApp();
  }, []);
  
  // Show splash/loading screen while initializing
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1923' }}>
        <ActivityIndicator size="large" color="#00d4ff" />
      </View>
    );
  }
  
  return (
    <>
      <StatusBar style="light" backgroundColor="#0f1923" />
      <AppNavigator />
    </>
  );
}
