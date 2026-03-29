import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { TourCartProvider } from './src/contexts/TourCartContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { queryClient } from './src/lib/queryClient';

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TourCartProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </TourCartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
