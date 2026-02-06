import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/src/constants/theme';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="complaints" />
      <Stack.Screen name="bills" />
      <Stack.Screen name="citizens" />
      <Stack.Screen name="announcements" />
    </Stack>
  );
}
