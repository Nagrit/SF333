import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Check, X } from 'lucide-react-native';

export default function VoteResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const results = [
    { rank: 'อันดับ 1', rankBg: '#eef5f4', rankColor: '#217371', title: 'เสาร์ที่ 21 กุมภาพันธ์ 2026', time: '18:00 - 21:00 น.', status: 'ว่างครบ 5/5 คน', statusColor: '#22c55e', progress: 1.0, isWinner: true, avatars: ['https://picsum.photos/seed/r1/100', 'https://picsum.photos/seed/r2/100', 'https://picsum.photos/seed/r3/100', 'https://picsum.photos/seed/r4/100', 'https://picsum.photos/seed/r5/100'] },
    { rank: 'อันดับ 2', rankBg: '#eef5f4', rankColor: '#217371', title: 'อาทิตย์ที่ 22 กุมภาพันธ์ 2026', time: '12:00 - 15:00 น.', status: 'ว่าง 4/5 คน (นัท ไม่ว่าง)', statusColor: '#e08955', progress: 0.8, isWinner: false, avatars: ['https://picsum.photos/seed/r1/100', 'https://picsum.photos/seed/r2/100', 'https://picsum.photos/seed/r3/100', 'https://picsum.photos/seed/r4/100'] },
    { rank: 'อันดับ 3', rankBg: '#eef5f4', rankColor: '#217371', title: 'ศุกร์ที่ 20 กุมภาพันธ์ 2026', time: '19:00 - 22:00 น.', status: 'ว่าง 4/5 คน (ส้ม ไม่ว่าง)', statusColor: '#e08955', progress: 0.8, isWinner: false, avatars: ['https://picsum.photos/seed/r1/100', 'https://picsum.photos/seed/r2/100', 'https://picsum.photos/seed/r3/100', 'https://picsum.photos/seed/r4/100'] },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#cce1de' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View style={{ backgroundColor: '#468f92', paddingHorizontal: 20, paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
            <ArrowLeft color="#ffffff" size={22} />
          </TouchableOpacity>
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>โหวตการนัด 💻</Text>
        </View>
        <TouchableOpacity style={{ padding: 4 }}>
          <Share2 color="#ffffff" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 }}>นัดเที่ยวทะเลพัทยา 🏖️</Text>
        <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>กลุ่ม: แก๊งค์มหาลัย · สามารถเลือกได้มากกว่า 1 ข้อ</Text>

        {results.map((item, index) => (
          <View key={index} style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 14, elevation: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ backgroundColor: item.rankBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.rankColor }}>{item.rank}</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.statusColor }}>{item.status}</Text>
            </View>

            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 }}>{item.title}</Text>
            <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>⏰ {item.time}</Text>

            {/* Progress Bar */}
            <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <View style={{ height: '100%', width: `${item.progress * 100}%`, backgroundColor: item.isWinner ? '#4ade80' : '#e08955', borderRadius: 3 }} />
            </View>

            {/* Avatars */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: item.isWinner ? 14 : 0 }}>
              {item.avatars.map((url, idx) => (
                <Image key={idx} source={{ uri: url }} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -6 }} />
              ))}
            </View>

            {/* Winner Button */}
            {item.isWinner && (
              <TouchableOpacity 
                onPress={() => router.push('/appointment-detail')}
                style={{ backgroundColor: '#217371', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>สร้างนัดหมายด้วยเวลานี้</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}