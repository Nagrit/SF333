import DateTimePicker from '@react-native-community/datetimepicker';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, Package, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ==========================================
// 1. TYPES & INTERFACES FOR BACKEND
// ==========================================
export interface InvitedFriend {
  id: string;
  name: string;
  avatar: string;
  selected: boolean;
}

export interface CreateAppointmentPayload {
  title: string;
  selectedDate: string; // ISO String
  startTime: string;    // HH:mm (24h format for backend)
  endTime: string;      // HH:mm (24h format for backend)
  appDecide: boolean;
  location: string;
  details?: string;
  invitedFriendIds: string[];
  notifyEnabled: boolean;
}

// ==========================================
// 2. BACKEND API SERVICE (MOCK)
// ==========================================
const createAppointmentApi = async (payload: CreateAppointmentPayload): Promise<{ success: boolean; id: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, id: 'apt_' + Date.now() });
    }, 1500);
  });
};

const INITIAL_FRIENDS: InvitedFriend[] = [
  { id: '1', name: 'เจดน์', avatar: 'https://picsum.photos/seed/m1/100', selected: true },
  { id: '2', name: 'มินท์', avatar: 'https://picsum.photos/seed/m2/100', selected: true },
  { id: '3', name: 'เป้', avatar: 'https://picsum.photos/seed/m3/100', selected: true },
  { id: '4', name: 'ส้ม', avatar: 'https://picsum.photos/seed/m4/100', selected: true },
];

export default function CreateAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ดึงค่าระบบของเครื่องผู้ใช้งาน
  const deviceCalendar = Localization.getCalendars()[0];
  const is24HourDevice = deviceCalendar?.uses24HourClock ?? true;
  const userLocale = deviceCalendar?.locale || 'th-TH';

  // Form States
  const [title, setTitle] = useState('');
  const [appDecide, setAppDecide] = useState(false);
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');
  const [friends, setFriends] = useState<InvitedFriend[]>(INITIAL_FRIENDS);
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  // Date & Time States
  const [date, setDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(() => {
    const defaultEnd = new Date();
    defaultEnd.setHours(defaultEnd.getHours() + 2);
    return defaultEnd;
  });

  // Picker Visible States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Async & Loading State
  const [isLoading, setIsLoading] = useState(false);

  // Helper ฟอร์แมตวันที่แบบภาษาไทย
  const formatDateTH = (d: Date) => {
    const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  // Helper ฟอร์แมตเวลาแสดงผลบนปุ่มตาม Device Setting (12h/24h)
  const formatDisplayTime = (d: Date) => {
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !is24HourDevice
    });
  };

  // Helper ฟอร์แมตเวลามาตรฐาน HH:mm สำหรับส่ง Backend
  const formatBackendTime = (d: Date) => {
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const toggleFriend = (id: string) => {
    setFriends(prev => prev.map(f => (f.id === id ? { ...f, selected: !f.selected } : f)));
  };

  const handleAddFriend = () => {
    Alert.alert('เชิญเพื่อน', 'เลือกเพื่อนเพิ่มเติมจากรายชื่อกลุ่มของคุณ', [
      { text: 'ไปที่กลุ่ม', onPress: () => router.push('/groups') },
      { text: 'ปิด', style: 'cancel' }
    ]);
  };

  // Handlers
  const onDateChange = (selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onStartTimeChange = (selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (!selectedTime) return;

    setStartTime(selectedTime);

    const startMinutes = selectedTime.getHours() * 60 + selectedTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    if (startMinutes >= endMinutes) {
      const newEndTime = new Date(selectedTime);
      newEndTime.setHours(newEndTime.getHours() + 1);
      setEndTime(newEndTime);
    }
  };

  const onEndTimeChange = (selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (!selectedTime) return;

    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const selectedEndMinutes = selectedTime.getHours() * 60 + selectedTime.getMinutes();

    if (selectedEndMinutes <= startMinutes) {
      Alert.alert(
        'เวลาไม่ถูกต้อง',
        'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น กรุณาเลือกเวลาใหม่อีกครั้ง'
      );
      return;
    }

    setEndTime(selectedTime);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อกิจกรรมก่อนส่งคำเชิญนัดหมาย');
      return;
    }

    if (!appDecide) {
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

      if (endMinutes <= startMinutes) {
        Alert.alert('เวลาไม่ถูกต้อง', 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
        return;
      }
    }

    if (!location.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณาระบุสถานที่นัดหมาย');
      return;
    }

    const selectedFriendIds = friends.filter(f => f.selected).map(f => f.id);
    const payload: CreateAppointmentPayload = {
      title: title.trim(),
      selectedDate: date.toISOString(),
      startTime: formatBackendTime(startTime),
      endTime: formatBackendTime(endTime),
      appDecide,
      location: location.trim(),
      details: details.trim(),
      invitedFriendIds: selectedFriendIds,
      notifyEnabled,
    };

    try {
      setIsLoading(true);
      const result = await createAppointmentApi(payload);

      if (result.success) {
        Alert.alert('สำเร็จ 🎉', 'ส่งคำเชิญนัดหมายเรียบร้อยแล้ว', [
          { text: 'ตกลง', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างนัดหมายได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const invitedCount = friends.filter(f => f.selected).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#cce1de' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
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
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }} disabled={isLoading}>
          <ArrowLeft color="#ffffff" size={22} />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>
          สร้างนัดหมายใหม่
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* ชื่อกิจกรรม */}
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>ชื่อกิจกรรม</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="เช่น ชาบูกับชาวแก๊งค์ 🍲"
          placeholderTextColor="#9ca3af"
          editable={!isLoading}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(70,143,146,0.25)',
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            color: '#1f2937',
            marginBottom: 16
          }}
        />

        {/* วันที่และเวลา */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>วันที่และเวลา</Text>
          <TouchableOpacity
            onPress={() => setAppDecide(prev => !prev)}
            disabled={isLoading}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: appDecide ? '#468f92' : '#ffffff',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: appDecide ? '#468f92' : 'rgba(70,143,146,0.25)'
            }}
          >
            <Package color={appDecide ? '#ffffff' : '#468f92'} size={14} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: appDecide ? '#ffffff' : '#468f92' }}>
              ให้แอปช่วยเลือก
            </Text>
          </TouchableOpacity>
        </View>

        {appDecide ? (
          <View
            style={{
              backgroundColor: '#e6f2f1',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#468f92',
              padding: 14,
              marginBottom: 16,
              alignItems: 'center'
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#468f92', marginBottom: 2 }}>
              ✨ APP DECIDE Mode
            </Text>
            <Text style={{ fontSize: 11, color: '#4b5563', textAlign: 'center' }}>
              ระบบจะเปิดโหวตเพื่อให้ทุกคนในกลุ่มเลือกวันและเวลาที่สะดวกที่สุด
            </Text>
          </View>
        ) : (
          <View style={{ marginBottom: 16 }}>
            {/* เลือกวันที่ */}
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              disabled={isLoading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(70,143,146,0.25)',
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 10
              }}
            >
              <Calendar color="#468f92" size={16} style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 13, color: '#1f2937' }}>
                {formatDateTH(date)}
              </Text>
            </TouchableOpacity>

            {/* เลือกช่วงเวลา (เริ่ม - สิ้นสุด) */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* เวลาเริ่มต้น */}
              <TouchableOpacity
                onPress={() => setShowStartTimePicker(true)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(70,143,146,0.25)',
                  paddingHorizontal: 14,
                  paddingVertical: 12
                }}
              >
                <Clock color="#468f92" size={16} style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontSize: 10, color: '#6b7280' }}>เริ่ม</Text>
                  <Text style={{ fontSize: 13, color: '#1f2937', fontWeight: '500' }}>
                    {formatDisplayTime(startTime)}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* เวลาสิ้นสุด */}
              <TouchableOpacity
                onPress={() => setShowEndTimePicker(true)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(70,143,146,0.25)',
                  paddingHorizontal: 14,
                  paddingVertical: 12
                }}
              >
                <Clock color="#468f92" size={16} style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontSize: 10, color: '#6b7280' }}>สิ้นสุด</Text>
                  <Text style={{ fontSize: 13, color: '#1f2937', fontWeight: '500' }}>
                    {formatDisplayTime(endTime)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'android' ? 'default' : 'inline'}
            locale={userLocale}
            onValueChange={(_event, newDate) => onDateChange(newDate)}
            onDismiss={() => setShowDatePicker(false)}
            minimumDate={new Date()}
          />
        )}

        {/* Start Time Picker - ปรับรองรับ Android Clock/Native UI */}
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            is24Hour={Platform.OS === 'android' ? undefined : is24HourDevice}
            locale={userLocale}
            display={Platform.OS === 'android' ? 'clock' : 'compact'}
            onValueChange={(_event, newTime) => onStartTimeChange(newTime)}
            onDismiss={() => setShowStartTimePicker(false)}
          />
        )}

        {/* End Time Picker - ปรับรองรับ Android Clock/Native UI */}
        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            is24Hour={Platform.OS === 'android' ? undefined : is24HourDevice}
            locale={userLocale}
            display={Platform.OS === 'android' ? 'clock' : 'compact'}
            onValueChange={(_event, newTime) => onEndTimeChange(newTime)}
            onDismiss={() => setShowEndTimePicker(false)}
          />
        )}

        {/* สถานที่ */}
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>สถานที่</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(70,143,146,0.25)',
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 16
          }}
        >
          <MapPin color="#468f92" size={16} style={{ marginRight: 8 }} />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="เช่น Shabu Baru, Siam Paragon ชั้น 4"
            placeholderTextColor="#9ca3af"
            editable={!isLoading}
            style={{ flex: 1, fontSize: 13, color: '#1f2937' }}
          />
        </View>

        {/* รายละเอียดเพิ่มเติม */}
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>รายละเอียดเพิ่มเติม</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="เพิ่มรายละเอียด เช่น ของที่ต้องเตรียม หรือหมายเหตุอื่น ๆ"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!isLoading}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(70,143,146,0.25)',
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 13,
            color: '#1f2937',
            minHeight: 90,
            marginBottom: 16
          }}
        />

        {/* เชิญเพื่อน */}
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 10 }}>
          เชิญเพื่อน {invitedCount > 0 ? `(${invitedCount} คน)` : ''}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {friends.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => toggleFriend(f.id)}
              disabled={isLoading}
              style={{ alignItems: 'center', marginRight: 16, opacity: f.selected ? 1 : 0.4 }}
            >
              <View>
                <Image source={{ uri: f.avatar }} style={{ width: 48, height: 48, borderRadius: 24, marginBottom: 6 }} />
                {f.selected && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: -2,
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: '#f87171',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: '#ffffff'
                    }}
                  >
                    <X color="#ffffff" size={10} strokeWidth={3} />
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#374151' }}>{f.name}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={handleAddFriend} disabled={isLoading} style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: '#ed8b6e',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6
              }}
            >
              <Plus color="#ed8b6e" size={20} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ed8b6e' }}>เพิ่มเพื่อน</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* เปิดแจ้งเตือน */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(70,143,146,0.25)',
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 24
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>เปิดแจ้งเตือน</Text>
            <Switch
              value={notifyEnabled}
              onValueChange={setNotifyEnabled}
              disabled={isLoading}
              trackColor={{ false: '#d1d5db', true: '#3caea3' }}
              thumbColor="#ffffff"
            />
          </View>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            เตือนล่วงหน้า 1 ชั่วโมง ก่อนเวลานัด
          </Text>
        </View>

        {/* ปุ่มส่งคำเชิญนัดหมาย */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? '#8caeaf' : '#265c5e',
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}>ส่งคำเชิญนัดหมาย</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}