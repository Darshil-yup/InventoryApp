import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import SplashScreenProvider from './SplashScreenProvider';
import { ThemeProvider } from '../contexts/ThemeContext';
import { MasterDataProvider } from '../contexts/MasterDataContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <MasterDataProvider>
        <SplashScreenProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="transactions" options={{ headerShown: false }} />
          </Stack>
        </SplashScreenProvider>
      </MasterDataProvider>
    </ThemeProvider>
  );
}
