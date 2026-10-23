import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getToken } from '../services/api'; // 1. ดึง getToken จาก api.ts มาใช้

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // 1. ดึง Token จาก SecureStore (ผ่าน getToken)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();
        if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
          setUserToken(token);
        } else {
          setUserToken(null);
        }
      } catch (error) {
        setUserToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [segments]); // 2. ให้เช็กสิทธิ์ใหม่เมื่อมีการสลับกลุ่มหน้า

  // 2. ดักการนำทาง (Route Guard)
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!userToken && !inAuthGroup) {
      // ถ้าไม่มี Token และไม่ได้อยู่ในกลุ่มหน้า (auth) -> ย้ายไป Login
      router.replace('/(auth)/login');
    } else if (userToken && inAuthGroup) {
      // ถ้ามี Token แล้วแต่ดันค้างหน้า (auth) -> ย้ายไป Main Tabs
      router.replace('/(tabs)');
    }
  }, [userToken, isLoading, segments]);

  // 3. แสดงหน้า Loading ระหว่างรอเช็ก Token
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#cce1de' }}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(auth)/forgot-password" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}