import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Switch,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, MapPin, Package, Plus, X } from 'lucide-react-native';

interface InvitedFriend {
  id: string;
  name: string;
  avatar: string;
  selected: boolean;
}

const INITIAL_FRIENDS: InvitedFriend[] = [
  { id: '1', name: 'เจดน์', avatar: 'https://picsum.photos/seed/m1/100', selected: true },
  { id: '2', name: 'มินท์', avatar: 'https://picsum.photos/seed/m2/100', selected: true },
  { id: '3', name: 'เป้', avatar: 'https://picsum.photos/seed/m3/100', selected: true },
  { id: '4', name: 'ส้ม', avatar: 'https://picsum.photos/seed/m4/100', selected: true },
];

export default function CreateAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [dateTimeText, setDateTimeText] = useState('เสาร์ที่ 21 ก.พ. 2026 (18:00 - 21:00)');
  const [appDecide, setAppDecide] = useState(false);
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');
  const [friends, setFriends] = useState<InvitedFriend[]>(INITIAL_FRIENDS);
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  const toggleFriend = (id: string) => {
    setFriends(prev => prev.map(f => (f.id === id ? { ...f, selected: !f.selected } : f)));
  };

  const handleAddFriend = () => {
    Alert.alert('เชิญเพื่อน', 'เลือกเพื่อนเพิ่มเติมจากรายชื่อกลุ่มของคุณ', [
      { text: 'ไปที่กลุ่ม', onPress: () => router.push('/groups') },
      { text: 'ปิด', style: 'cancel' }
    ]);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อกิจกรรมก่อนส่งคำเชิญนัดหมาย');
      return;
    }
    if (!location.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณาระบุสถานที่นัดหมาย');
      return;
    }
    Alert.alert('สำเร็จ 🎉', 'ส่งคำเชิญนัดหมายเรียบร้อยแล้ว', [
      { text: 'ตกลง', onPress: () => router.back() }
    ]);
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
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
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
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>วันที่และเวลา</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(70,143,146,0.25)',
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginRight: 10
            }}
          >
            <Calendar color="#468f92" size={16} style={{ marginRight: 8 }} />
            {appDecide ? (
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#468f92', letterSpacing: 0.5 }}>
                APP DECIDE
              </Text>
            ) : (
              <TextInput
                value={dateTimeText}
                onChangeText={setDateTimeText}
                placeholder="เลือกวันที่และเวลานัดหมาย"
                placeholderTextColor="#9ca3af"
                style={{ flex: 1, fontSize: 13, color: '#1f2937' }}
              />
            )}
          </View>

          <TouchableOpacity
            onPress={() => setAppDecide(prev => !prev)}
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: appDecide ? '#468f92' : '#ffffff',
              borderWidth: 1,
              borderColor: appDecide ? '#468f92' : 'rgba(70,143,146,0.25)'
            }}
          >
            <Package color={appDecide ? '#ffffff' : '#468f92'} size={20} />
          </TouchableOpacity>
        </View>
        {appDecide && (
          <Text style={{ fontSize: 11, color: '#6b7280', marginTop: -12, marginBottom: 16 }}>
            ให้แอปช่วยเลือกวันและเวลาที่สะดวกที่สุดจากผลโหวตของทุกคน
          </Text>
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

          <TouchableOpacity onPress={handleAddFriend} style={{ alignItems: 'center' }}>
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
          style={{
            backgroundColor: '#265c5e',
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
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}>ส่งคำเชิญนัดหมาย</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
