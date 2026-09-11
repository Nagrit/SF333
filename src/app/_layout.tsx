import { Slot, usePathname, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Calendar, Clock, Plus, User, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

function BottomNavLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ตรวจสอบการล็อกอินเมื่อเปิดแอป
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // ดึง Token ที่เก็บบันทึกไว้
      const token = await SecureStore.getItemAsync('userToken');
      
      // ถ้าไม่มี Token ให้บังคับไปหน้า /login ทันที
      if (!token) {
        router.replace('/login');
      }
    } catch (error) {
      router.replace('/login');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const hideBottomNavRoutes = [
    '/login',
    '/register',
    '/create-appointment',
    '/appointment-detail',
    '/forgot-password',
  ];

  const shouldHideBottomNav = hideBottomNavRoutes.some(route => pathname.startsWith(route));

  // แสดง Loading ระหว่างเช็ค Token
  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: '#cce1de', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      {!shouldHideBottomNav && (
        <View
          style={{
            backgroundColor: '#ffffff',
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTopWidth: 1,
            borderColor: '#f3f4f6',
            elevation: 10,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12)
          }}
        >
          <TouchableOpacity onPress={() => router.push('/')} style={{ alignItems: 'center', flex: 1 }}>
            <Calendar color={pathname === '/' ? "#ed8b6e" : "#718096"} size={22} />
            <Text style={{ fontSize: 10, fontWeight: pathname === '/' ? 'bold' : 'normal', color: pathname === '/' ? '#ed8b6e' : '#718096', marginTop: 4 }}>
              ปฏิทิน
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/groups')} style={{ alignItems: 'center', flex: 1 }}>
            <Users color={pathname.includes('group') ? "#ed8b6e" : "#718096"} size={22} />
            <Text style={{ fontSize: 10, fontWeight: pathname.includes('group') ? 'bold' : 'normal', color: pathname.includes('group') ? '#ed8b6e' : '#718096', marginTop: 4 }}>
              กลุ่ม
            </Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.push('/create-appointment')}
              style={{
                width: 48,
                height: 48,
                backgroundColor: '#468f92',
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -10,
                elevation: 4,
              }}
            >
              <Plus color="white" size={26} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/schedules')} style={{ alignItems: 'center', flex: 1 }}>
            <Clock color={pathname === '/schedules' ? "#ed8b6e" : "#718096"} size={22} />
            <Text style={{ fontSize: 10, fontWeight: pathname === '/schedules' ? 'bold' : 'normal', color: pathname === '/schedules' ? '#ed8b6e' : '#718096', marginTop: 4 }}>
              นัดหมาย
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/profile')} style={{ alignItems: 'center', flex: 1 }}>
            <User color={pathname === '/profile' ? "#ed8b6e" : "#718096"} size={22} />
            <Text style={{ fontSize: 10, fontWeight: pathname === '/profile' ? 'bold' : 'normal', color: pathname === '/profile' ? '#ed8b6e' : '#718096', marginTop: 4 }}>
              โปรไฟล์
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <BottomNavLayout />
    </SafeAreaProvider>
  );
}