import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Bell, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export type AppointmentStatus = 'green' | 'red' | 'orange';
export type CalendarViewType = 'week' | 'month' | 'year';

export interface AppointmentItem {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  statusText: string;
  avatars: string[];
}

export interface PendingAppointmentItem {
  id: string;
  category: string;
  title: string;
  groupName: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

//ส่วนสำหรับปรับแต่งสูตรคำนวณสถานะอัตโนมัติ
const CALCULATION_CONFIG = {
  busyThresholdPercent: 0.8,    // ถ้าสัดส่วนนัดหมายเทียบกับน้ำหนักเกณฑ์ มากกว่า 80% (0.8) จะกลายเป็น "ไม่ว่าง" (แดง)
  maybeThresholdPercent: 0.4,   // ถ้ามากกว่า 40% (0.4) แต่ไม่ถึง 80% จะกลายเป็น "อาจจะ" (ส้ม)
  maxDailyAppointmentsBase: 5   // สมมติฐานจำนวนนัดหมายสูงสุดต่อวันสำหรับใช้คำนวณเปอร์เซ็นต์ความหนาแน่น
};

const MOCK_APPOINTMENTS: AppointmentItem[] = [
  {
    id: 'm1',
    date: '2026-9-14',
    time: '18:30 น.',
    title: 'ชาบูกับชาวแก๊งค์ 🍲',
    location: 'ร้าน Shabu Baru (Siam Paragon)',
    statusText: 'ว่างครบทุกคน (5/5)',
    avatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100'
    ]
  },
  {
    id: 'm2',
    date: '2026-9-14',
    time: '18:30 น.',
    title: 'ประชุมออนไลน์แก๊งแดกชาบูกับชาวแก๊งค์',
    location: 'Google Meet',
    statusText: 'ว่างครบทุกคน (5/5)',
    avatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'
    ]
  },
  {
    id: 'm3',
    date: '2026-9-15',
    time: '13:00 น.',
    title: 'ประชุมวางแผนกลยุทธ์การตลาด Q4',
    location: 'ห้องประชุมใหญ่ ชั้น 15 (True Digital Park)',
    statusText: 'รอยืนยัน (3/5)',
    avatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    ]
  },
  {
    id: 'm4',
    date: '2026-9-18',
    time: '17:30 น.',
    title: 'ออกกำลังกายตีแบดมินตัน',
    location: 'สนามแบด The Court แจ้งวัฒนะ',
    statusText: 'ว่าง 4 คน',
    avatars: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100'
    ]
  }
];

const MOCK_PENDING_APPOINTMENTS: PendingAppointmentItem[] = [
  {
    id: 'p1',
    category: '🍔 นัดเที่ยว',
    title: 'ทริปหัวหิน 3 วัน 2 คืน',
    groupName: 'กลุ่ม: แก๊งแดกชาบู'
  },
  {
    id: 'p2',
    category: '🍔 นัดเที่ยว',
    title: 'ทริปหัวหิน 3 วัน 2 คืน',
    groupName: 'กลุ่ม: แก๊งแดกชาบู'
  }
];

export default function IndexScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const currentUser = auth.currentUser;
  const scrollViewRef = useRef<ScrollView>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: currentUser?.uid || 'u1',
    name: currentUser?.displayName || 'คุณภัทร (บอส)',
    avatar: currentUser?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
  });

  const [calendarView, setCalendarView] = useState<CalendarViewType>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1)); 
  const [selectedDate, setSelectedDate] = useState('2026-9-14'); 
  
  const [dateStatuses, setDateStatuses] = useState<Record<string, AppointmentStatus>>({});
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | null>(null);

  // ฟังก์ชันคำนวณสถานะวัน (รองรับสูตรคำนวณตามสัดส่วนนัดหมาย)
  const getDayStatus = (fullDate: string | null): AppointmentStatus => {
    if (!fullDate) return 'green';
    if (dateStatuses[fullDate]) return dateStatuses[fullDate]; // ถ้ามีการ Override ด้วยมือ
    
    // กรองหานัดหมายในวันนี้
    const dayAppointments = MOCK_APPOINTMENTS.filter(item => item.date === fullDate);
    const count = dayAppointments.length;

    if (count === 0) return 'green'; // ไม่มีนัด = ว่าง (เขียว)

    // คำนวณสัดส่วนเทียบกับเกณฑ์ฐาน
    const ratio = count / CALCULATION_CONFIG.maxDailyAppointmentsBase;

    if (ratio >= CALCULATION_CONFIG.busyThresholdPercent) {
      return 'red'; // มากกว่า 80% = ไม่ว่าง (แดง)
    } else if (ratio >= CALCULATION_CONFIG.maybeThresholdPercent) {
      return 'orange'; // มากกว่า 40% แต่ไม่ถึง 80% = อาจจะ (ส้ม)
    }
    
    return 'green';
  };

  const getAppointmentCountForMonth = (year: number, monthIndex: number) => {
    const targetMonthPrefix = `${year}-${monthIndex + 1}-`;
    return MOCK_APPOINTMENTS.filter(item => item.date.startsWith(targetMonthPrefix)).length;
  };

  const filteredAppointments = useMemo(() => {
    return MOCK_APPOINTMENTS.filter(item => item.date === selectedDate);
  }, [selectedDate]);

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
        }
      } catch (e) {
        console.log('Error loading user profile:', e);
      }
    };
    loadUserData();
  }, [currentUser]);

  const handleSelectDate = (fullDate: string) => {
    setSelectedDate(fullDate);
    scrollViewRef.current?.scrollTo({ y: 450, animated: true });
  };

  const handleSaveStatus = async () => {
    const previousStatuses = { ...dateStatuses };
    const newStatuses = { ...dateStatuses };
    
    if (selectedStatus) {
      newStatuses[selectedDate] = selectedStatus;
    } else {
      delete newStatuses[selectedDate];
    }

    setDateStatuses(newStatuses);
    setIsStatusModalOpen(false);

    if (!currentUser?.uid) return;
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

  const handleOpenStatusModal = (fullDate: string) => {
    setSelectedDate(fullDate);
    setSelectedStatus(getDayStatus(fullDate));
    setIsStatusModalOpen(true);
  };

  const handlePrev = () => {
    if (calendarView === 'week') {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const prevW = new Date(y, m - 1, d - 7);
      setSelectedDate(`${prevW.getFullYear()}-${prevW.getMonth() + 1}-${prevW.getDate()}`);
      setCurrentMonth(new Date(prevW.getFullYear(), prevW.getMonth(), 1));
    } else if (calendarView === 'year') {
      setCurrentMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
    } else {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (calendarView === 'week') {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const nextW = new Date(y, m - 1, d + 7);
      setSelectedDate(`${nextW.getFullYear()}-${nextW.getMonth() + 1}-${nextW.getDate()}`);
      setCurrentMonth(new Date(nextW.getFullYear(), nextW.getMonth(), 1));
    } else if (calendarView === 'year') {
      setCurrentMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
    } else {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: '', status: null, fullDate: null });
    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = `${year}-${month + 1}-${i}`;
      days.push({ date: i.toString(), status: getDayStatus(fullDate), fullDate });
    }
    return days;
  }, [currentMonth, dateStatuses]);

  const weeklyDays = useMemo(() => {
    if (!selectedDate) return [];
    const [y, m, d] = selectedDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    const firstDayOfWeek = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - curr.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate() + i);
      const fullDate = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
      days.push({ date: day.getDate().toString(), status: getDayStatus(fullDate), fullDate, dayObj: day });
    }
    return days;
  }, [selectedDate, dateStatuses]);

  const renderWeekHeader = () => {
    if (weeklyDays.length < 7) return null;
    const first = weeklyDays[0].dayObj;
    const last = weeklyDays[6].dayObj;
    const weekOfMonth = Math.ceil(last.getDate() / 7);

    let rangeText = '';
    if (first.getMonth() === last.getMonth()) {
      rangeText = `${first.getDate()} - ${last.getDate()} ${THAI_MONTHS[first.getMonth()]} ${first.getFullYear()}`;
    } else {
      rangeText = `${first.getDate()} ${THAI_MONTHS[first.getMonth()]} - ${last.getDate()} ${THAI_MONTHS[last.getMonth()]} ${first.getFullYear()}`;
    }

    return (
      <View style={{ alignItems: 'flex-start', flex: 1, paddingLeft: 10 }}>
        <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>สัปดาห์ที่ {weekOfMonth} ของเดือน</Text>
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#4a3b32' }}>{rangeText}</Text>
      </View>
    );
  };

  // ฟังก์ชันเลือกสีจุดสถานะตามค่า type
  const getDotColor = (status: AppointmentStatus | null) => {
    if (status === 'red') return '#f87171';
    if (status === 'orange') return '#e08955';
    return '#4ade80';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#cce1de' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} overScrollMode="never">
        {/* Top Header */}
        <View style={{ backgroundColor: '#468f92', paddingHorizontal: 20, paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12, paddingBottom: 40, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={{ uri: userProfile.avatar }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#ffffff', marginRight: 10 }} />
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' }}>Welcome back,</Text>
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 'bold' }}>{userProfile.name}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
              <Bell color="#e08955" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={{ marginHorizontal: 16, marginTop: -20, backgroundColor: '#ffffff', borderRadius: 24, padding: 4, flexDirection: 'row', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
          {[
            { key: 'week', label: 'รายสัปดาห์' },
            { key: 'month', label: 'รายเดือน' },
            { key: 'year', label: 'รายปี' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setCalendarView(tab.key as CalendarViewType)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: calendarView === tab.key ? '#609a96' : 'transparent', alignItems: 'center' }}
            >
              <Text style={{ color: calendarView === tab.key ? '#ffffff' : '#6b7280', fontSize: 13, fontWeight: 'bold' }}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calendar Area */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#ffffff', borderRadius: 24, padding: 16, elevation: 3 }}>
          
          <View style={{ flexDirection: 'row', justifyContent: calendarView === 'week' ? 'flex-start' : 'center', alignItems: 'center', marginBottom: 16, position: 'relative' }}>
            <TouchableOpacity onPress={handlePrev} style={{ zIndex: 1, padding: 4, position: calendarView === 'week' ? 'relative' : 'absolute', left: 0 }}>
              <ChevronLeft color="#4a3b32" size={20} />
            </TouchableOpacity>
            
            {calendarView === 'week' ? (
              renderWeekHeader()
            ) : (
              <TouchableOpacity 
                onPress={() => setCalendarView('year')} 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4a3b32' }}>
                  {calendarView === 'year' 
                    ? currentMonth.getFullYear() 
                    : `${THAI_MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}
                </Text>
                {isCalendarLoading && <ActivityIndicator size="small" color="#468f92" />}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={handleNext} style={{ zIndex: 1, padding: 4, position: calendarView === 'week' ? 'relative' : 'absolute', right: 0 }}>
              <ChevronRight color="#4a3b32" size={20} />
            </TouchableOpacity>
          </View>

          {/* มุมมองรายปี */}
          {calendarView === 'year' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {THAI_MONTHS.map((month, idx) => {
                const count = getAppointmentCountForMonth(currentMonth.getFullYear(), idx);
                return (
                  <TouchableOpacity 
                    key={month} 
                    onPress={() => { 
                      setCurrentMonth(new Date(currentMonth.getFullYear(), idx, 1)); 
                      setCalendarView('month'); 
                    }} 
                    style={{ width: '31%', borderWidth: 1, borderColor: count > 0 ? '#468f92' : '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12, backgroundColor: count > 0 ? 'rgba(70, 143, 146, 0.05)' : '#f9fafb' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>{month}</Text>
                    <Text style={{ fontSize: 10, color: count > 0 ? '#e08955' : '#4ade80', fontWeight: '600' }}>
                      {count > 0 ? `${count} นัดหมาย` : 'ว่าง'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* รายเดือน และ รายสัปดาห์ */}
          {calendarView !== 'year' && (
            <>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, i) => (
                  <View key={i} style={{ width: '14.28%', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: i === 0 ? '#e08955' : '#4a3b32' }}>{day}</Text>
                  </View>
                ))}
              </View>
              <View style={{ height: 1, backgroundColor: '#8c7365', opacity: 0.3, marginBottom: 8 }} />
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {(calendarView === 'month' ? calendarDays : weeklyDays).map((d, i) => {
                  const todayObj = new Date();
                  const todayString = `${todayObj.getFullYear()}-${todayObj.getMonth() + 1}-${todayObj.getDate()}`;
                  const isToday = d.fullDate === todayString;

                  return (
                    <View key={i} style={{ width: '14.28%', height: 42, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 }}>
                      {d.fullDate && (
                        <TouchableOpacity
                          onPress={() => handleSelectDate(d.fullDate!)}
                          onLongPress={() => handleOpenStatusModal(d.fullDate!)}
                          style={{ alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, backgroundColor: d.fullDate === selectedDate ? '#b5d5d0' : 'transparent' }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: isToday ? '#e08955' : '#4a3b32' }}>
                            {d.date}
                          </Text>
                          {/* จุดแสดงสถานะ (เขียว, ส้ม, แดง) */}
                          <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: getDotColor(d.status) }} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={{ height: 1, backgroundColor: '#8c7365', opacity: 0.3, marginVertical: 12 }} />
              
              {/* Legend คำอธิบายจุดสี */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#4ade80', marginRight: 4 }} /><Text style={{ fontSize: 9, color: '#4a3b32', fontWeight: 'bold' }}>ว่าง</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#e08955', marginRight: 4 }} /><Text style={{ fontSize: 9, color: '#4a3b32', fontWeight: 'bold' }}>อาจจะ</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#f87171', marginRight: 4 }} /><Text style={{ fontSize: 9, color: '#4a3b32', fontWeight: 'bold' }}>ไม่ว่าง</Text></View>
              </View>
            </>
          )}
        </View>

        {/* นัดหมายที่รอยืนยัน / โหวตเวลา */}
        {calendarView !== 'year' && (
          <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 24, padding: 14, elevation: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#c2410c' }}>
                นัดหมายที่รอยืนยัน / โหวตเวลา
              </Text>
              <View style={{ backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#c2410c' }}>ยังไม่ได้ลงปฏิทิน 2</Text>
              </View>
            </View>
            <Text style={{ fontSize: 10, color: '#9a3412', marginBottom: 12 }}>
              นัดหมายเหล่านี้ยังรอโหวตเคาะวัน เมื่อยืนยันแล้วจะปรากฏในปฏิทินทันที
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {MOCK_PENDING_APPOINTMENTS.map((item) => (
                <View key={item.id} style={{ width: 210, backgroundColor: '#ffffff', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: '#fed7aa', elevation: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#c2410c', marginBottom: 2 }}>{item.category}</Text>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 }}>{item.title}</Text>
                  <Text style={{ fontSize: 10, color: '#6b7280', marginBottom: 10 }}>{item.groupName}</Text>

                  <TouchableOpacity 
                    style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 8, alignItems: 'center' }}
                    onPress={() => Alert.alert('ร่วมโหวต', `คุณกำลังไปหน้าโหวตของ: ${item.title}`)}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>ร่วมโหวต / เคาะวัน</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* รายการนัดหมายประจำวัน */}
        {calendarView !== 'year' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#374151' }}>
                นัดหมายวันที่ ({selectedDate ? `${selectedDate.split('-')[2]} ${THAI_MONTHS[parseInt(selectedDate.split('-')[1]) - 1]}` : ''})
              </Text>
              <TouchableOpacity onPress={() => router.push('/schedules')}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280' }}>ดูทั้งหมด</Text>
              </TouchableOpacity>
            </View>

            {filteredAppointments.length === 0 ? (
              <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>ไม่มีนัดหมายในวันนี้</Text>
              </View>
            ) : (
              filteredAppointments.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push({ pathname: '/appointment-detail', params: { id: item.id } })}
                  activeOpacity={0.8}
                  style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}
                >
                  <View style={{ backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, marginRight: 10, width: 90, alignItems: 'center', justifyContent: 'center', elevation: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>{item.time}</Text>
                  </View>

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
        )}
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
                onPress={() => setSelectedStatus(selectedStatus === 'orange' ? null : 'orange')}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center', borderColor: selectedStatus === 'orange' ? '#e08955' : '#f3f4f6', backgroundColor: selectedStatus === 'orange' ? 'rgba(224, 137, 85, 0.1)' : '#f9fafb' }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: selectedStatus === 'orange' ? '#e08955' : '#9ca3af' }}>อาจจะ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus(selectedStatus === 'red' ? null : 'red')}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center', borderColor: selectedStatus === 'red' ? '#f87171' : '#f3f4f6', backgroundColor: selectedStatus === 'red' ? 'rgba(248, 113, 113, 0.1)' : '#f9fafb' }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: selectedStatus === 'red' ? '#f87171' : '#9ca3af' }}>ไม่ว่าง</Text>
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