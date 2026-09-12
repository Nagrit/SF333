import { Slot, usePathname, useRouter } from 'expo-router';
import { Calendar, Clock, Plus, User, Users } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
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
        {/* 1. ปฏิทิน */}
        <TouchableOpacity
          onPress={() => router.push('/')}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <Calendar color={pathname === '/' || pathname === '/index' ? "#ed8b6e" : "#718096"} size={22} />
          <Text style={{ fontSize: 10, fontWeight: pathname === '/' || pathname === '/index' ? 'bold' : 'normal', color: pathname === '/' || pathname === '/index' ? '#ed8b6e' : '#718096', marginTop: 4 }}>
            ปฏิทิน
          </Text>
        </TouchableOpacity>

        {/* 2. กลุ่ม */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/groups')} style={{ alignItems: 'center', flex: 1 }}>
          <Users color={pathname.includes('groups') ? "#ed8b6e" : "#718096"} size={22} />
          <Text style={{ fontSize: 10, fontWeight: pathname.includes('groups') ? 'bold' : 'normal', color: pathname.includes('groups') ? '#ed8b6e' : '#718096', marginTop: 4 }}>
            กลุ่ม
          </Text>
        </TouchableOpacity>

        {/* 3. ปุ่ม + ตรงกลาง */}
        {(() => {
          const isCreatePage = pathname.includes('create-appointment');
          const fabColor = isCreatePage ? '#f7b924' : '#468f92';
          const fabIconColor = isCreatePage ? '#3a2c05' : '#ffffff';
          return (
            <View style={{ alignItems: 'center', flex: 1 }}>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/create-appointment')}
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: fabColor,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -10,
                  elevation: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3
                }}
              >
                <Plus color={fabIconColor} size={26} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* 4. นัดหมาย */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/schedules')} style={{ alignItems: 'center', flex: 1 }}>
          <Clock color={pathname.includes('schedules') ? "#ed8b6e" : "#718096"} size={22} />
          <Text style={{ fontSize: 10, fontWeight: pathname.includes('schedules') ? 'bold' : 'normal', color: pathname.includes('schedules') ? '#ed8b6e' : '#718096', marginTop: 4 }}>
            นัดหมาย
          </Text>
        </TouchableOpacity>

        {/* 5. โปรไฟล์ */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={{ alignItems: 'center', flex: 1 }}>
          <User color={pathname.includes('profile') ? "#ed8b6e" : "#718096"} size={22} />
          <Text style={{ fontSize: 10, fontWeight: pathname.includes('profile') ? 'bold' : 'normal', color: pathname.includes('profile') ? '#ed8b6e' : '#718096', marginTop: 4 }}>
            โปรไฟล์
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}