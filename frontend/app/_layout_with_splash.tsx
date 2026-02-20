import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import SplashScreenProvider from './SplashScreenProvider';

/**
 * Root Layout Component with Custom Splash Screen
 * 
 * This layout wraps the entire app with a custom splash screen provider
 * that shows the Chicago Booth logo with smooth animations during app startup.
 * 
 * Features:
 * - Smooth fade-in and scale animation for the logo
 * - Minimum 2-second display time
 * - Fade-out transition to main app
 * - White background matching brand identity
 */
export default function RootLayout() {
    return (
        <SplashScreenProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
        </SplashScreenProvider>
    );
}
