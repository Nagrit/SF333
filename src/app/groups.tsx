import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Image, 
  StatusBar,
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, ChevronRight } from 'lucide-react-native';

const FRIENDS = [
  { id: '1', name: 'จ', color: '#EAFF00' },
  { id: '2', name: 'อ', color: '#FF00F2' },
  { id: '3', name: 'พ', color: '#ed553b' },
  { id: '4', name: 'พฤ', color: '#a388cd' },
  { id: '5', name: 'ศ', color: '#a388cd' },

];

const GROUPS = [
  {
    id: '1',
    name: 'แก๊งค์มหาลัย 🎓',
    lastActive: '10 นาทีที่แล้ว',
    badgeText: 'นัดหมายใหม่ 2',
    badgeType: 'orange',
    membersCount: 5,
    avatars: ['https://picsum.photos/seed/a1/100', 'https://picsum.photos/seed/a2/100', 'https://picsum.photos/seed/a3/100']
  },
  {
    id: '2',
    name: 'ทีมออฟฟิศ 💻',
    lastActive: '1 ชั่วโมงที่แล้ว',
    badgeText: 'นัดหมายใหม่ 1',
    badgeType: 'orange',
    membersCount: 5,
    avatars: ['https://picsum.photos/seed/b1/100', 'https://picsum.photos/seed/b2/100']
  },
  {
    id: '3',
    name: 'แฟมิลี่ 🏡',
    lastActive: 'วานนี้',
    badgeText: null,
    badgeType: null,
    membersCount: 5,
    avatars: ['https://picsum.photos/seed/c1/100', 'https://picsum.photos/seed/c2/100']
  },
  {
    id: '4',
    name: 'ชมรมวิ่ง 🏃‍♂️',
    lastActive: '3 วันที่แล้ว',
    badgeText: 'โพลใหม่ 1',
    badgeType: 'purple',
    membersCount: 5,
    avatars: ['https://picsum.photos/seed/d1/100', 'https://picsum.photos/seed/d2/100']
  },
];

export default function GroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: '#dbe6e5' }}>
      {/* ใช้ StatusBar โปร่งใสเพื่อความเนียนแบบเต็มขอบ */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header ปรับ paddingTop อมรับขอบบนของจอ */}
      <View 
        style={{ 
          backgroundColor: '#468f92', 
          paddingHorizontal: 20, 
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12, 
          paddingBottom: 16, 
          flexDirection: 'row', 
          justify: 'space-between', 
          alignItems: 'center' 
        }}
      >
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 22 }}>กลุ่มของฉัน</Text>
        <TouchableOpacity style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
          <Plus color="white" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Search Bar */}
        <View style={{ backgroundColor: '#ffffff', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 }}>
          <Search color="#70adb0" size={18} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ค้นหากลุ่มหรือเพื่อน..."
            style={{ flex: 1, marginLeft: 10, fontSize: 14, color: '#1f2937' }}
          />
        </View>

        {/* เพื่อนของฉัน */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#4a3b32', marginBottom: 12 }}>เพื่อนของฉัน</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity style={{ alignItems: 'center' }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ed8b6e', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Plus color="#ed8b6e" size={22} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ed8b6e' }}>เพิ่มเพื่อน</Text>
            </TouchableOpacity>

            {FRIENDS.map((friend) => (
              <TouchableOpacity key={friend.id} style={{ alignItems: 'center' }}>
                <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: friend.color, marginBottom: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151' }}>{friend.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* กลุ่มทั้งหมด */}
        <View>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#4a3b32', marginBottom: 12 }}>กลุ่มทั้งหมด</Text>
          
          {GROUPS.map((group) => (
            <TouchableOpacity 
              key={group.id}
              onPress={() => router.push({ pathname: '/group-detail', params: { name: group.name } })}
              style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(60,174,163,0.3)', elevation: 1 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1f2937' }}>{group.name}</Text>
                {group.badgeText && (
                  <View style={{ backgroundColor: group.badgeType === 'orange' ? '#fdebe4' : '#f0e9f7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: group.badgeType === 'orange' ? '#ed7d58' : '#9c71ce' }}>
                      {group.badgeText}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>เคลื่อนไหวล่าสุด: {group.lastActive}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                    {group.avatars.map((url, idx) => (
                      <Image key={idx} source={{ uri: url }} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -10 }} />
                    ))}
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#468f92' }}>
                    สมาชิก {group.membersCount} คน
                  </Text>
                </View>

                <ChevronRight color="#ed8b6e" size={20} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}