
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apiFetch, getToken } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // 1. ตรวจสอบ Login
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const token = await getToken();

        if (cancelled) return;

        if (
          token &&
          token !== 'null' &&
          token !== 'undefined' &&
          token.trim() !== ''
        ) {
          setUserToken(token);
        } else {
          setUserToken(null);
        }
      } catch {
        if (!cancelled) setUserToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [segments]);

  // 2. Route Guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!userToken && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (userToken && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [userToken, isLoading, segments, router]);

  // 3. ลงทะเบียน Push Token หลัง Login
  // ต้องอยู่ก่อน if (isLoading) return เพื่อรักษาลำดับ Hooks
  useEffect(() => {
    if (!userToken || Platform.OS === 'web') return;

    let cancelled = false;

    const registerPushToken = async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'การแจ้งเตือนนัดหมาย',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
          });
        }

        let permission = await Notifications.getPermissionsAsync();

        if (permission.status !== 'granted') {
          permission = await Notifications.requestPermissionsAsync();
        }

        if (permission.status !== 'granted' || cancelled) {
          console.log('[Push] Notification permission not granted');
          return;
        }

        const projectId =
          Constants.easConfig?.projectId ??
          Constants.expoConfig?.extra?.eas?.projectId;

        if (!projectId) {
          console.warn('[Push] Missing EAS projectId');
          return;
        }

        const result = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        if (cancelled) return;

        // ตรวจสอบว่า JWT ในเครื่องยังเป็นบัญชีที่กำลังลงทะเบียน
        const currentToken = await getToken();

        if (cancelled || currentToken !== userToken) {
          console.log('[Push] Skipped registration: account changed');
          return;
        }

        // บังคับให้คำขอนี้ใช้ JWT ของบัญชีที่ Effect นี้รับผิดชอบ
        await apiFetch(
          '/api/notifications/push-token',
          {
            method: 'POST',
            body: JSON.stringify({
              token: result.data,
              platform: Platform.OS,
            }),
          },
          userToken,
        );

        if (!cancelled) {
          console.log('[Push] Push token registered');
        }

        if (!cancelled) {
          console.log('[Push] Push token registered');
        }
      } catch (error) {
        console.warn('[Push] Registration failed:', error);
      }
    };

    registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [userToken]);

  // 4. Loading UI — ต้องอยู่หลัง Hooks ทั้งหมด
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#cce1de',
        }}
      >
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
