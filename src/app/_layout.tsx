import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(auth)/forgot-password" />
        
        {/* กลุ่มหน้าหลักที่มี Tab Bar */}
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}