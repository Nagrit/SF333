import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Bell, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase Imports
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db } from '../services/firebase'; // ปรับ Path ตามโครงสร้างไฟล์ของคุณ

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export type AppointmentStatus = 'green' | 'red' | 'orange';

export interface AppointmentItem {
  id: string;
  time: string;
  title: string;
  location: string;
  statusText: string;
  avatars: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

export default function IndexScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const currentUser = auth.currentUser;

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: currentUser?.uid || 'u1',
    name: currentUser?.displayName || 'ผู้ใช้งาน',
    avatar: currentUser?.photoURL || 'https://picsum.photos/seed/user1/100'
  });

  // Calendar States
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
  );
  const [dateStatuses, setDateStatuses] = useState<Record<string, AppointmentStatus>>({});
  
  // Data & Loading States
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Modal States
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | null>(null);

  const horizontalPadding = 40;
  const dayCellWidth = (width - horizontalPadding) / 7;

  // 1. โหลดข้อมูล Profile จาก SecureStore / Firestore
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedUserInfo = await SecureStore.getItemAsync('userInfo');
        if (savedUserInfo) {
          const parsed = JSON.parse(savedUserInfo);
          setUserProfile(prev => ({
            ...prev,
            name: parsed.name || prev.name,
            avatar: parsed.avatar || prev.avatar,
          }));
        } else if (currentUser?.uid) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserProfile({
              id: currentUser.uid,
              name: data.name || 'ผู้ใช้งาน',
              avatar: data.avatar || 'https://picsum.photos/seed/user1/100'
            });
          }
        }
      } catch (e) {
        console.log('Error loading user profile:', e);
      }
    };
    loadUserData();
  }, [currentUser]);

  // 2. ดึงสถานะปฏิทินประจำเดือนจาก Firestore
  const loadMonthStatuses = useCallback(async () => {
    if (!currentUser?.uid) return;
    setIsCalendarLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      const userStatusesRef = collection(db, 'users', currentUser.uid, 'user_statuses');
      const querySnapshot = await getDocs(userStatusesRef);
      
      const statusesMap: Record<string, AppointmentStatus> = {};
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status) {
          statusesMap[docSnap.id] = data.status;
        }
      });

      setDateStatuses(statusesMap);
    } catch (error) {
      console.log('Error fetching statuses:', error);
    } finally {
      setIsCalendarLoading(false);
    }
  }, [currentMonth, currentUser]);

  // 3. ดึงนัดหมายประจำวันจาก Firestore
  const loadDailyAppointments = useCallback(async (dateStr: string) => {
    if (!currentUser?.uid) return;
    setIsAppointmentsLoading(true);
    try {
      const aptRef = collection(db, 'appointments');
      const q = query(
        aptRef, 
        where('date', '==', dateStr),
        where('members', 'array-contains', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const list: AppointmentItem[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          time: data.time || '18:00 น.',
          title: data.title || 'นัดหมาย',
          location: data.location || 'ไม่ระบุสถานที่',
          statusText: data.statusText || 'สมาชิกพร้อม',
          avatars: data.avatars || ['https://picsum.photos/seed/p1/100']
        });
      });

      setAppointments(list);
    } catch (error) {
      console.log('Error fetching daily appointments:', error);
    } finally {
      setIsAppointmentsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadMonthStatuses();
  }, [loadMonthStatuses]);

  useEffect(() => {
    if (selectedDate) {
      loadDailyAppointments(selectedDate);
    }
  }, [selectedDate, loadDailyAppointments]);

  // 4. บันทึกสถานะวันว่างลง Firestore
  const handleSaveStatus = async () => {
    if (!currentUser?.uid) return;

    const previousStatuses = { ...dateStatuses };
    const newStatuses = { ...dateStatuses };
    
    if (selectedStatus) {
      newStatuses[selectedDate] = selectedStatus;
    } else {
      delete newStatuses[selectedDate];
    }

    setDateStatuses(newStatuses);
    setIsStatusModalOpen(false);

    try {
      setIsSavingStatus(true);
      const statusDocRef = doc(db, 'users', currentUser.uid, 'user_statuses', selectedDate);
      
      await setDoc(statusDocRef, {
        date: selectedDate,
        status: selectedStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      setDateStatuses(previousStatuses);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกสถานะได้');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleOpenStatusModal = (fullDate: string) => {
    setSelectedDate(fullDate);
    setSelectedStatus(dateStatuses[fullDate] || null);
    setIsStatusModalOpen(true);
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', status: null, fullDate: null });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = `${year}-${month + 1}-${i}`;
      const status = dateStatuses[fullDate] || null;
      days.push({ date: i.toString(), status, fullDate });
    }
    return days;
  }, [currentMonth, dateStatuses]);

  return (
    <View style={{ flex: 1, backgroundColor: '#cce1de' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never">
        {/* Top Header */}
        <View
          style={{
            backgroundColor: '#468f92',
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12,
            paddingBottom: 36,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: userProfile.avatar }}
                style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#ffffff', marginRight: 10 }}
              />
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' }}>Welcome back,</Text>
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 'bold' }}>{userProfile.name}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}
            >
              <Bell color="#e08955" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card ปฏิทิน */}
        <View style={{ marginHorizontal: 16, marginTop: -24, backgroundColor: '#ffffff', borderRadius: 24, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }}>
          {/* หัวปฏิทิน */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 4 }}>
              <ChevronLeft color="#4a3b32" size={20} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4a3b32' }}>
                {THAI_MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              {isCalendarLoading && <ActivityIndicator size="small" color="#468f92" />}
            </View>

            <TouchableOpacity onPress={handleNextMonth} style={{ padding: 4 }}>
              <ChevronRight color="#4a3b32" size={20} />
            </TouchableOpacity>
          </View>

          {/* ชื่อวัน */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, i) => (
              <View key={i} style={{ width: dayCellWidth, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: i === 0 ? '#e08955' : '#4a3b32' }}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: '#8c7365', opacity: 0.3, marginBottom: 8 }} />

          {/* ตารางวันที่ */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((d, i) => (
              <View key={i} style={{ width: dayCellWidth, height: 42, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 }}>
                {d.fullDate ? (
                  <TouchableOpacity
                    onPress={() => setSelectedDate(d.fullDate!)}
                    onLongPress={() => handleOpenStatusModal(d.fullDate!)}
                    style={{ alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, backgroundColor: d.fullDate === selectedDate ? '#b5d5d0' : 'transparent' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4a3b32' }}>
                      {d.date}
                    </Text>
                    {d.status && (
                      <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: d.status === 'green' ? '#4ade80' : d.status === 'red' ? '#f87171' : '#e08955' }} />
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: '#8c7365', opacity: 0.3, marginVertical: 12 }} />

          {/* Legend คำอธิบายจุดสี */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#4ade80', marginRight: 5 }} />
              <Text style={{ fontSize: 10, color: '#4a3b32', fontWeight: 'bold' }}>ว่าง</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#f87171', marginRight: 5 }} />
              <Text style={{ fontSize: 10, color: '#4a3b32', fontWeight: 'bold' }}>ไม่ว่าง</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#e08955', marginRight: 5 }} />
              <Text style={{ fontSize: 10, color: '#4a3b32', fontWeight: 'bold' }}>อาจจะว่าง</Text>
            </View>
          </View>
        </View>

        {/* รายการนัดหมายประจำวัน */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#374151' }}>
              นัดหมายวันที่ ({selectedDate ? `${selectedDate.split('-')[2]} ${THAI_MONTHS[parseInt(selectedDate.split('-')[1]) - 1]}` : ''})
            </Text>
            <TouchableOpacity onPress={() => router.push('/schedules')}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280' }}>ดูทั้งหมด</Text>
            </TouchableOpacity>
          </View>

          {isAppointmentsLoading ? (
            <ActivityIndicator color="#468f92" style={{ marginVertical: 20 }} />
          ) : appointments.length === 0 ? (
            <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>ไม่มีนัดหมายในวันนี้</Text>
            </View>
          ) : (
            appointments.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push({ pathname: '/appointment-detail', params: { id: item.id } })}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}
              >
                {/* กล่องเวลา */}
                <View style={{ backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, marginRight: 10, width: 90, alignItems: 'center', justifyContent: 'center', elevation: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>{item.time}</Text>
                </View>

                {/* รายละเอียดนัดหมาย */}
                <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 18, padding: 12, elevation: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>{item.title}</Text>
                  <Text style={{ fontSize: 10, color: '#9ca3af', marginBottom: 8 }}>{item.location}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {item.avatars.map((url, idx) => (
                        <Image key={idx} source={{ uri: url }} style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -6 }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#217371' }}>{item.statusText}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal กำหนดสถานะ */}
      <Modal visible={isStatusModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 320 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', color: '#1f2937', fontSize: 14 }}>
                กำหนดสถานะ {selectedDate ? `${selectedDate.split('-')[2]} ${THAI_MONTHS[parseInt(selectedDate.split('-')[1]) - 1]}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setIsStatusModalOpen(false)}>
                <X color="#9ca3af" size={20} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setSelectedStatus(selectedStatus === 'green' ? null : 'green')}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center', borderColor: selectedStatus === 'green' ? '#4ade80' : '#f3f4f6', backgroundColor: selectedStatus === 'green' ? 'rgba(74, 222, 128, 0.1)' : '#f9fafb' }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: selectedStatus === 'green' ? '#4ade80' : '#9ca3af' }}>ว่าง</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus(selectedStatus === 'red' ? null : 'red')}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center', borderColor: selectedStatus === 'red' ? '#f87171' : '#f3f4f6', backgroundColor: selectedStatus === 'red' ? 'rgba(248, 113, 113, 0.1)' : '#f9fafb' }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: selectedStatus === 'red' ? '#f87171' : '#9ca3af' }}>ไม่ว่าง</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus(selectedStatus === 'orange' ? null : 'orange')}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center', borderColor: selectedStatus === 'orange' ? '#e08955' : '#f3f4f6', backgroundColor: selectedStatus === 'orange' ? 'rgba(224, 137, 85, 0.1)' : '#f9fafb' }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: selectedStatus === 'orange' ? '#e08955' : '#9ca3af' }}>อาจจะ</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSaveStatus}
              disabled={isSavingStatus}
              style={{ backgroundColor: '#468f92', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
            >
              {isSavingStatus ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>บันทึกสถานะ</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}