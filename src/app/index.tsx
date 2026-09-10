import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  useWindowDimensions,
  StatusBar,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ChevronLeft, ChevronRight, X } from 'lucide-react-native';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

type AppointmentStatus = 'green' | 'red' | 'orange';

interface AppointmentItem {
  id: string;
  time: string;
  title: string;
  location: string;
  statusText: string;
  avatars: string[];
}

export default function IndexScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1, 1)); // กุมภาพันธ์ 2026
  const [selectedDate, setSelectedDate] = useState('2026-2-14');

  // สถานะวันที่สำหรับแสดงจุดสี
  const [dateStatuses, setDateStatuses] = useState<Record<string, AppointmentStatus>>({
    '2026-2-1': 'red', '2026-2-2': 'green', '2026-2-3': 'orange',
    '2026-2-4': 'green', '2026-2-5': 'red', '2026-2-6': 'green', '2026-2-7': 'green', '2026-2-8': 'orange', '2026-2-9': 'red', '2026-2-10': 'green',
    '2026-2-11': 'green', '2026-2-12': 'orange', '2026-2-13': 'red', '2026-2-14': 'green', '2026-2-15': 'green', '2026-2-16': 'red', '2026-2-17': 'orange',
    '2026-2-18': 'green', '2026-2-19': 'green', '2026-2-20': 'red', '2026-2-21': 'green', '2026-2-22': 'orange', '2026-2-23': 'red', '2026-2-24': 'green',
    '2026-2-25': 'green', '2026-2-26': 'red', '2026-2-27': 'green', '2026-2-28': 'orange',
  });

  // ข้อมูลนัดหมายจำลองสำหรับวันที่ 14 ก.พ.
  const appointments: AppointmentItem[] = [
    {
      id: '1',
      time: '18:30 น.',
      title: 'ชาบูกับชาวแก๊งค์ 🍲',
      location: 'ร้าน Shabu Baru (Siam Paragon)',
      statusText: 'ว่างครบทุกคน (5/5)',
      avatars: [
        'https://picsum.photos/seed/p1/100',
        'https://picsum.photos/seed/p2/100',
        'https://picsum.photos/seed/p3/100',
      ]
    },
    {
      id: '2',
      time: '20:30 น.',
      title: 'ประชุมงานอ. ปิยะ',
      location: 'ประชุมใน Zoom',
      statusText: 'ว่างครบทุกคน (5/5)',
      avatars: [
        'https://picsum.photos/seed/p1/100',
        'https://picsum.photos/seed/p2/100',
        'https://picsum.photos/seed/p3/100',
      ]
    }
  ];

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | null>(null);

  const horizontalPadding = 40;
  const dayCellWidth = (width - horizontalPadding) / 7;

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSaveStatus = () => {
    if (selectedStatus) {
      setDateStatuses(prev => ({ ...prev, [selectedDate]: selectedStatus }));
    } else {
      const newStatuses = { ...dateStatuses };
      delete newStatuses[selectedDate];
      setDateStatuses(newStatuses);
    }
    setIsStatusModalOpen(false);
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
        {/* Top Header สีเขียวทีล */}
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
                source={{ uri: 'https://picsum.photos/seed/user1/100' }}
                style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#ffffff', marginRight: 10 }}
              />
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' }}>Welcome back,</Text>
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 'bold' }}>คุณนภัส (บอส)</Text>
              </View>
            </View>

            {/* ปุ่มกระดิ่ง เชื่อมโยงไปยังหน้า /notifications */}
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}
            >
              <Bell color="#e08955" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card ปฏิทินลอยซ้อน Header */}
        <View style={{ marginHorizontal: 16, marginTop: -24, backgroundColor: '#ffffff', borderRadius: 24, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }}>
          {/* หัวปฏิทิน เลือกเดือน */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 4 }}>
              <ChevronLeft color="#4a3b32" size={20} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4a3b32' }}>
              {THAI_MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={{ padding: 4 }}>
              <ChevronRight color="#4a3b32" size={20} />
            </TouchableOpacity>
          </View>

          {/* ชื่อวัน ส. - อาท. */}
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
                    onPress={() => setSelectedDate(d.fullDate)}
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

        {/* ส่วนรายการนัดหมายประจำวัน */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#374151' }}>
              นัดหมายวันนี้ ({selectedDate ? `${selectedDate.split('-')[2]} ก.พ.` : '14 ก.พ.'})
            </Text>
            <TouchableOpacity onPress={() => router.push('/schedules')}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280' }}>ดูทั้งหมด</Text>
            </TouchableOpacity>
          </View>

          {/* การ์ดรายการนัดหมาย - เพิ่ม TouchableOpacity ครอบการ์ดทั้งหมด */}
          {appointments.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push('/appointment-detail')}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}
            >
              {/* กล่องเวลาฝั่งซ้าย */}
              <View style={{ backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, marginRight: 10, width: 90, alignItems: 'center', justifyContent: 'center', elevation: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>{item.time}</Text>
              </View>

              {/* รายละเอียดนัดหมายฝั่งขวา */}
              <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 18, padding: 12, elevation: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>{item.title}</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af', marginBottom: 8 }}>{item.location}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {item.avatars.map((url, idx) => (
                      <Image key={idx} source={{ uri: url }} style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -6 }} />
                    ))}
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#217371', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#ffffff', marginLeft: -6 }}>
                      <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#ffffff' }}>+2</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#217371' }}>{item.statusText}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal สำหรับเลือกตั้งสถานะ */}
      <Modal visible={isStatusModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 320 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', color: '#1f2937', fontSize: 14 }}>
                กำหนดสถานะ {selectedDate.split('-')[2]} ก.พ.
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
              style={{ backgroundColor: '#468f92', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>บันทึกสถานะ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}