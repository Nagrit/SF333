import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, Calendar, Check, Clock, MapPin, Share2, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ==========================================
// 1. TYPES & INTERFACES FOR BACKEND
// ==========================================
export interface Member {
  id: string;
  name: string;
  avatar: string;
  status: 'confirmed' | 'pending' | 'rejected' | 'voted' | 'waiting';
  statusText: string;
}

export interface AppointmentDetail {
  id: string;
  title: string;
  organizerName: string;
  organizerAvatar: string;
  isVotingMode: boolean;
  dateText?: string;
  timeText?: string;
  location: string;
  hasTimeConflict?: boolean;
  conflictDetailText?: string;
  userResponse: 'accept' | 'reject' | null;
  members: Member[];
}

export interface RespondAppointmentPayload {
  appointmentId: string;
  response: 'accept' | 'reject';
}

// ==========================================
// 2. MOCK BACKEND API SERVICES
// ==========================================
const fetchAppointmentDetailApi = async (id: string): Promise<AppointmentDetail> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        title: 'ชาบูกับชาวแก๊งค์ 🍲',
        organizerName: 'เจดน์',
        organizerAvatar: 'https://picsum.photos/seed/m1/100',
        isVotingMode: false,
        dateText: 'วันเสาร์ที่ 21 กุมภาพันธ์ 2026',
        timeText: '18:00 - 21:00 น.',
        location: 'Shabu Baru, Siam Paragon ชั้น 4',
        hasTimeConflict: true,
        conflictDetailText: "ประชุมโปรเจกต์กลุ่ม (18:00 - 19:30 น.)",
        userResponse: null,
        members: [
          { id: '1', name: 'เจดน์', avatar: 'https://picsum.photos/seed/m1/100', status: 'confirmed', statusText: 'ตอบรับแล้ว' },
          { id: '2', name: 'มินท์', avatar: 'https://picsum.photos/seed/m2/100', status: 'confirmed', statusText: 'ตอบรับแล้ว' },
          { id: '3', name: 'เป้', avatar: 'https://picsum.photos/seed/m3/100', status: 'pending', statusText: 'รอคำตอบ' },
          { id: '4', name: 'ส้ม', avatar: 'https://picsum.photos/seed/m4/100', status: 'rejected', statusText: 'ปฏิเสธแล้ว' },
        ],
      });
    }, 600);
  });
};

const respondAppointmentApi = async (payload: RespondAppointmentPayload): Promise<{ success: boolean }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 800);
  });
};

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  // Data & Loading States
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);

  // ดึงรายละเอียดนัดหมายจาก Backend
  const loadAppointmentDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      const appointmentId = params.id || '1';
      const data = await fetchAppointmentDetailApi(appointmentId);
      setAppointment(data);
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลนัดหมายได้');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadAppointmentDetail();
  }, [loadAppointmentDetail]);

  // Handler ส่งการตอบรับ/ปฏิเสธ
  const handleUserResponse = async (response: 'accept' | 'reject') => {
    if (!appointment) return;

    const previousResponse = appointment.userResponse;
    
    // Optimistic Update
    setAppointment(prev => prev ? { ...prev, userResponse: response } : null);

    try {
      setIsResponding(true);
      const res = await respondAppointmentApi({
        appointmentId: appointment.id,
        response,
      });

      if (!res.success) throw new Error();
    } catch (error) {
      // Rollback หาก API ล้มเหลว
      setAppointment(prev => prev ? { ...prev, userResponse: previousResponse } : null);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งคำตอบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsResponding(false);
    }
  };

  // Handler สลับโหมดทดสอบ (Normal <-> Vote)
  const toggleMode = () => {
    if (!appointment) return;
    const isVoting = !appointment.isVotingMode;
    setAppointment({
      ...appointment,
      isVotingMode: isVoting,
      title: isVoting ? 'นัดเที่ยวทะเลพัทยา 🏖️' : 'ชาบูกับชาวแก๊งค์ 🍲',
      members: isVoting ? [
        { id: '1', name: 'เจดน์', avatar: 'https://picsum.photos/seed/m1/100', status: 'voted', statusText: 'โหวตแล้ว' },
        { id: '2', name: 'มินท์', avatar: 'https://picsum.photos/seed/m2/100', status: 'voted', statusText: 'โหวตแล้ว' },
        { id: '3', name: 'เป้', avatar: 'https://picsum.photos/seed/m3/100', status: 'waiting', statusText: 'รอดำเนินการ' },
        { id: '4', name: 'ส้ม', avatar: 'https://picsum.photos/seed/m4/100', status: 'waiting', statusText: 'รอดำเนินการ' },
      ] : [
        { id: '1', name: 'เจดน์', avatar: 'https://picsum.photos/seed/m1/100', status: 'confirmed', statusText: 'ตอบรับแล้ว' },
        { id: '2', name: 'มินท์', avatar: 'https://picsum.photos/seed/m2/100', status: 'confirmed', statusText: 'ตอบรับแล้ว' },
        { id: '3', name: 'เป้', avatar: 'https://picsum.photos/seed/m3/100', status: 'pending', statusText: 'รอคำตอบ' },
        { id: '4', name: 'ส้ม', avatar: 'https://picsum.photos/seed/m4/100', status: 'rejected', statusText: 'ปฏิเสธแล้ว' },
      ]
    });
  };

  // แชร์นัดหมาย
  const handleShare = async () => {
    if (!appointment) return;
    try {
      await Share.share({
        message: `นัดหมาย: ${appointment.title}\nสถานที่: ${appointment.location}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  if (isLoading || !appointment) {
    return (
      <View style={{ flex: 1, backgroundColor: '#cce1de', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#cce1de' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Top Header */}
      <View 
        style={{ 
          backgroundColor: '#468f92', 
          paddingHorizontal: 20, 
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12, 
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
            <ArrowLeft color="#ffffff" size={22} />
          </TouchableOpacity>
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>
            รายละเอียดการนัดหมาย
          </Text>
        </View>

        <TouchableOpacity onPress={handleShare} style={{ padding: 4 }}>
          <Share2 color="#ffffff" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        
        {/* Banner เตือนเวลาชนกัน */}
        {!appointment.isVotingMode && appointment.hasTimeConflict && (
          <View style={{ backgroundColor: '#fbe3e3', borderWidth: 1, borderColor: '#f87171', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <AlertCircle color="#ef4444" size={16} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 'bold', flex: 1 }}>
              เวลาชนกับนัดอื่น: '{appointment.conflictDetailText}'
            </Text>
          </View>
        )}

        {/* Card รายละเอียดการนัดหมาย */}
        <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, marginBottom: 16 }}>
          
          {/* จัดโดย... */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Image source={{ uri: appointment.organizerAvatar }} style={{ width: 22, height: 22, borderRadius: 11, marginRight: 6 }} />
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>ผู้จัดงาน: </Text>
            <Text style={{ fontSize: 11, color: '#468f92', fontWeight: 'bold' }}>{appointment.organizerName}</Text>
          </View>

          {/* ชื่อกิจกรรม */}
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 }}>
            {appointment.title}
          </Text>

          {/* วัน เวลา สถานที่ */}
          <View style={{ marginBottom: 12 }}>
            {!appointment.isVotingMode && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Calendar color="#468f92" size={15} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 12, color: '#4b5563' }}>{appointment.dateText}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Clock color="#468f92" size={15} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 12, color: '#4b5563' }}>{appointment.timeText}</Text>
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MapPin color="#468f92" size={15} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, color: '#4b5563', flex: 1 }}>
                {appointment.location}
              </Text>
            </View>
          </View>

          {/* แผนที่จำลอง */}
          <View style={{ height: 110, backgroundColor: '#111827', borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#468f92', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' }}>
              <MapPin color="#ffffff" size={18} />
            </View>
            <Text style={{ fontSize: 10, color: '#ffffff', fontWeight: 'bold', marginTop: 4 }}>{appointment.location}</Text>
          </View>
        </View>

        {/* ส่วนการตอบรับคำเชิญ / การโหวต */}
        {!appointment.isVotingMode ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 10 }}>
              ตอบรับคำเชิญของคุณ
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* ปุ่มตอบรับ */}
              <TouchableOpacity 
                onPress={() => handleUserResponse('accept')}
                disabled={isResponding}
                style={{ flex: 1, backgroundColor: appointment.userResponse === 'accept' ? '#22c55e' : '#4ade80', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
                <Check color="#ffffff" size={16} style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>ตอบรับ</Text>
              </TouchableOpacity>

              {/* ปุ่มปฏิเสธ */}
              <TouchableOpacity 
                onPress={() => handleUserResponse('reject')}
                disabled={isResponding}
                style={{ flex: 1, backgroundColor: appointment.userResponse === 'reject' ? '#dc2626' : '#f87171', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
                <X color="#ffffff" size={16} style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>ปฏิเสธ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 10 }}>
              โหวตวัน และเวลา
            </Text>
            <TouchableOpacity 
              onPress={() => router.push({ pathname: '/vote-appointment', params: { id: appointment.id } })}
              style={{ backgroundColor: '#217371', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>โหวตเลย</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* รายชื่อเพื่อนและสถานะ */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 12 }}>
            รายชื่อเพื่อนและสถานะ ({appointment.members.length} คน)
          </Text>

          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 12 }}>
            {appointment.members.map((m, idx) => (
              <View 
                key={m.id}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  paddingVertical: 10,
                  borderBottomWidth: idx === appointment.members.length - 1 ? 0 : 1,
                  borderColor: '#f3f4f6'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={{ uri: m.avatar }} style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }} />
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>{m.name}</Text>
                </View>

                {/* จุดและข้อความสถานะ */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View 
                    style={{ 
                      width: 6, 
                      height: 6, 
                      borderRadius: 3, 
                      marginRight: 6,
                      backgroundColor: 
                        m.status === 'confirmed' || m.status === 'voted' ? '#4ade80' :
                        m.status === 'pending' || m.status === 'waiting' ? '#e08955' : '#f87171'
                    }} 
                  />
                  <Text 
                    style={{ 
                      fontSize: 12, 
                      fontWeight: 'bold',
                      color: 
                        m.status === 'confirmed' || m.status === 'voted' ? '#22c55e' :
                        m.status === 'pending' || m.status === 'waiting' ? '#e08955' : '#ef4444'
                    }}
                  >
                    {m.statusText}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ปุ่มสลับโหมดทดสอบ (Normal <-> Vote) */}
        <TouchableOpacity 
          onPress={toggleMode}
          style={{ marginTop: 24, padding: 10, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 11, color: '#468f92', textDecorationLine: 'underline' }}>
            [สลับมุมมองไปแบบ{appointment.isVotingMode ? 'นัดหมายปกติ' : 'โหวตวันเวลา'}]
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}