import React from 'react';
import { Slot, useRouter, usePathname } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Users, Plus, Clock, User } from 'lucide-react-native';

function BottomNavLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* ส่วนแสดงผลของแต่ละหน้า */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      {/* Fixed Bottom Navigation Bar */}
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
        {/* 1. ปุ่มปฏิทิน */}
        <TouchableOpacity
          onPress={() => router.push('/')}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <Calendar color={pathname === '/' ? "#ed8b6e" : "#718096"} size={22} />
          <Text style={{ fontSize: 10, fontWeight: pathname === '/' ? 'bold' : 'normal', color: pathname === '/' ? '#ed8b6e' : '#718096', marginTop: 4 }}>
            ปฏิทิน
          </Text>
        </TouchableOpacity>

        {/* 2. ปุ่มกลุ่ม */}
        <TouchableOpacity
          onPress={() => router.push('/groups')}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <Users color={pathname.includes('group') ? "#ed8b6e" : "#718096"} size={22} />
          <Text style={{ fontSize: 10, fontWeight: pathname.includes('group') ? 'bold' : 'normal', color: pathname.includes('group') ? '#ed8b6e' : '#718096', marginTop: 4 }}>
            กลุ่ม
          </Text>
        </TouchableOpacity>

        {/* 3. ปุ่ม + Floating ตรงกลาง */}
        <View style={{ alignItems: 'center', flex: 1 }}>
          <TouchableOpacity
            onPress={() => router.push('/create-appointment')}
            style={{
              width: 48,
              height: 48,
              backgroundColor: '#468f92',
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center', // แก้จาก justify เป็น justifyContent
              marginTop: -10,            // ปรับลดจาก -20 เป็น -10 ให้ลอยกำลังดี
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3
            }}
          >
            <Plus color="white" size={26} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* 4. ปุ่มนัดหมาย */}
        <TouchableOpacity
          onPress={() => router.push('/schedules')}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <Clock color={pathname === '/schedules' ? "#ed8b6e" : "#718096"} size={22} />
          <Text style={{ fontSize: 10, fontWeight: pathname === '/schedules' ? 'bold' : 'normal', color: pathname === '/schedules' ? '#ed8b6e' : '#718096', marginTop: 4 }}>
            นัดหมาย
          </Text>
        </TouchableOpacity>

        {/* 5. ปุ่มโปรไฟล์ */}
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <User color={pathname === '/profile' ? "#ed8b6e" : "#718096"} size={22} />
          <Text style={{ fontSize: 10, fontWeight: pathname === '/profile' ? 'bold' : 'normal', color: pathname === '/profile' ? '#ed8b6e' : '#718096', marginTop: 4 }}>
            โปรไฟล์
          </Text>
        </TouchableOpacity>
      </View>
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