import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="citizen-login" />
      <Stack.Screen name="admin-login" />
    </Stack>
  );
}
