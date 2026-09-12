import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SchedulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sections = [
    {
      dateHeader: 'วันนี้ — 14 ก.พ. 2026',
      items: [
        { id: '1', time: '18:30 น.', title: 'ชาบูกับชาวแก๊งค์ 🍲', location: 'ร้าน Shabu Baru (Siam Paragon)', badge: 'ยืนยันแล้ว', badgeBg: '#dcfce7', badgeColor: '#16a34a', avatars: ['https://picsum.photos/seed/s1/100', 'https://picsum.photos/seed/s2/100', 'https://picsum.photos/seed/s3/100'] },
        { id: '2', time: '20:00 น.', title: 'ดูหนังกับแฟน 🎬', location: 'SF Cinema (Siam Paragon)', badge: 'ยืนยันแล้ว', badgeBg: '#dcfce7', badgeColor: '#16a34a', avatars: ['https://picsum.photos/seed/s4/100', 'https://picsum.photos/seed/s5/100'] },
      ]
    },
    {
      dateHeader: 'พรุ่งนี้ — 15 ก.พ. 2026',
      items: [
        { id: '3', time: '10:00 น.', title: 'บรั้นช์วันหยุด ☕', location: 'Roast Coffee ทองหล่อ', badge: 'รอตอบรับ', badgeBg: '#fef3c7', badgeColor: '#d97706', avatars: ['https://picsum.photos/seed/s6/100', 'https://picsum.photos/seed/s7/100', 'https://picsum.photos/seed/s8/100'] }
      ]
    },
    {
      dateHeader: '18 ก.พ. 2026',
      items: [
        { id: '4', time: '19:00 น.', title: 'เล่นบอร์ดเกม 🎲', location: 'Folio Board Game Cafe อารีย์', badge: 'โหวตอยู่', badgeBg: '#f3e8ff', badgeColor: '#9333ea', avatars: ['https://picsum.photos/seed/s9/100', 'https://picsum.photos/seed/s10/100'] }
      ]
    }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#cce1de' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View style={{ backgroundColor: '#468f92', paddingHorizontal: 20, paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12, paddingBottom: 16 }}>
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>นัดหมายทั้งหมด</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {sections.map((sec, secIdx) => (
          <View key={secIdx} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4b5563', marginBottom: 8 }}>{sec.dateHeader}</Text>
            
            {sec.items.map((item) => (
              <TouchableOpacity 
                key={item.id}
                onPress={() => {
                  if (item.badge === 'โหวตอยู่') {
                    router.push('/vote-appointment');
                  } else {
                    router.push('/appointment-detail');
                  }
                }}
                activeOpacity={0.8}
                style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 14, marginBottom: 10, elevation: 1 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Time Box */}
                  <View style={{ backgroundColor: '#fef3c7', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10, width: 70, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#78350f' }}>{item.time}</Text>
                  </View>

                  {/* Detail Box */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1f2937' }}>{item.title}</Text>
                      <View style={{ backgroundColor: item.badgeBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: item.badgeColor }}>{item.badge}</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 10, color: '#9ca3af', marginBottom: 8 }}>{item.location}</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', marginRight: 6 }}>
                        {item.avatars.map((url, idx) => (
                          <Image key={idx} source={{ uri: url }} style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -6 }} />
                        ))}
                      </View>
                      <Text style={{ fontSize: 9, color: '#6b7280' }}>เพื่อนเข้าร่วม (6)</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}