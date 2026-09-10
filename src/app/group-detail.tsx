import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Calendar } from 'lucide-react-native';

interface GroupAppointment {
  id: string;
  title: string;
  dateText: string;
  creator: string;
  headerBg: string;
  isVote?: boolean;
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // ดึงชื่อกลุ่มจาก URL Parameters (ถ้าไม่มีจะใช้ค่าเริ่มต้น)
  const groupName = (params.name as string) || 'ทีมออฟฟิศ 💻';

  // ข้อมูลนัดหมายจำลองภายในกลุ่ม
  const appointments: GroupAppointment[] = [
    {
      id: '1',
      title: 'ประชุม',
      dateText: 'วันที่ 15 เวลา 13.00 - 14.00 น.',
      creator: 'ทิฟ',
      headerBg: '#e2d4c3',
    },
    {
      id: '2',
      title: 'นัดกินเลี้ยง',
      dateText: 'วันที่ 16 เวลา 13.00 - 14.00 น.',
      creator: 'ทิฟ',
      headerBg: '#a1c2be',
    },
    {
      id: '3',
      title: '[โหวต] เที่ยว',
      dateText: 'วันที่ 16 เวลา 13.00 - 14.00 น.',
      creator: 'ทิฟ',
      headerBg: '#cfc9df',
      isVote: true,
    },
    {
      id: '4',
      title: 'Board Game Night 🎲',
      dateText: 'วันที่ 20 เวลา 18.00 - 21.00 น.',
      creator: 'บอส',
      headerBg: '#e2d4c3',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#dbe6e5' }}>
      {/* แถบ Status Bar โปร่งใส */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header ส่วนบน ปรับ paddingTop ให้หลบ Notch จอ */}
      <View 
        style={{ 
          backgroundColor: '#468f92', 
          paddingHorizontal: 20, 
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12, 
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
          <ArrowLeft color="#ffffff" size={22} />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>
          {groupName}
        </Text>
      </View>

      {/* Main Scrollable Area - รายการนัดหมายในกลุ่ม */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 90 }}
      >
        {appointments.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', marginBottom: 20, alignItems: 'flex-start' }}>
            
            {/* Avatar & Creator Name */}
            <View style={{ alignItems: 'center', marginRight: 12, width: 44 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#a388cd', marginBottom: 2 }} />
              <Text style={{ fontSize: 10, color: '#468f92', fontWeight: 'bold' }}>{item.creator}</Text>
            </View>

            {/* Appointment Card */}
            <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }}>
              
              {/* Card Banner */}
              <View style={{ backgroundColor: item.headerBg, height: 110, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4a3b32', marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'sans-serif' }}>
                  Friends Calendar
                </Text>
                <View style={{ width: 48, height: 36, backgroundColor: '#3caea3', borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 1 }}>
                  <Calendar color="#ffffff" size={20} />
                </View>
              </View>

              {/* Card Content */}
              <View style={{ padding: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
                  {item.dateText}
                </Text>

                {/* ปุ่มดูรายละเอียด */}
                <TouchableOpacity 
                  onPress={() => {
                    if (item.isVote) {
                      router.push('/vote-appointment');
                    } else {
                      router.push('/appointment-detail');
                    }
                  }}
                  style={{ backgroundColor: '#217371', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>ดูรายละเอียด</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        ))}
      </ScrollView>

      {/* ปุ่ม Floating Action (+) มุมขวาล่าง */}
      <TouchableOpacity 
        style={{ 
          position: 'absolute', 
          right: 20, 
          bottom: 24, 
          width: 52, 
          height: 52, 
          borderRadius: 26, 
          backgroundColor: '#468f92', 
          alignItems: 'center', 
          justify: 'center',
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4
        }}
      >
        <Plus color="#ffffff" size={28} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}