import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { colors } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onLanding = segments[0] === 'index' || segments.length === 0;

    if (!isAuthenticated) {
      if (!inAuthGroup && !onLanding) {
        router.replace('/');
      }
      return;
    }

    if (user?.type === 'admin') {
      if (!inAdminGroup) {
        router.replace('/(admin)');
      }
      return;
    }

    if (!inTabsGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, router, segments, user]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(admin)" options={{ gestureEnabled: false }} />
      </Stack>
    </AuthProvider>
  );
}
