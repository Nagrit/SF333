import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Check, CheckSquare, Square } from 'lucide-react-native';

export default function VoteAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedOptions, setSelectedOptions] = useState<string[]>(['1', '3']);

  const toggleOption = (id: string) => {
    setSelectedOptions(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const options = [
    { id: '1', title: 'ตัวเลือกที่ 1', date: 'วันเสาร์ที่ 21 กุมภาพันธ์ 2026', time: '08:00 - 20:00 น. (เต็มวัน)', votes: '4/5 โหวต', progress: 0.8, avatars: ['https://picsum.photos/seed/v1/100', 'https://picsum.photos/seed/v2/100', 'https://picsum.photos/seed/v3/100', 'https://picsum.photos/seed/v4/100'] },
    { id: '2', title: 'ตัวเลือกที่ 2', date: 'วันอาทิตย์ที่ 22 กุมภาพันธ์ 2026', time: '08:00 - 20:00 น. (เต็มวัน)', votes: '2/5 โหวต', progress: 0.4, avatars: ['https://picsum.photos/seed/v5/100', 'https://picsum.photos/seed/v6/100'] },
    { id: '3', title: 'ตัวเลือกที่ 3', date: 'วันเสาร์ที่ 28 กุมภาพันธ์ 2026', time: '08:00 - 20:00 น. (เต็มวัน)', votes: '3/5 โหวต', progress: 0.6, avatars: ['https://picsum.photos/seed/v7/100', 'https://picsum.photos/seed/v8/100', 'https://picsum.photos/seed/v9/100'] },
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
        {/* Title */}
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 }}>นัดเที่ยวทะเลพัทยา 🏖️</Text>
        <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>กลุ่ม: แก๊งค์มหาลัย · สามารถเลือกได้มากกว่า 1 ข้อ</Text>

        {/* Options */}
        {options.map((item) => {
          const isSelected = selectedOptions.includes(item.id);
          return (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => toggleOption(item.id)}
              activeOpacity={0.9}
              style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 14, elevation: 2 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isSelected ? (
                    <View style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: '#3caea3', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                      <Check color="white" size={14} strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#9ca3af', marginRight: 8 }} />
                  )}
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: isSelected ? '#217371' : '#6b7280' }}>{item.title}</Text>
                </View>
                <View style={{ backgroundColor: '#eef5f4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#217371' }}>{item.votes}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 }}>{item.date}</Text>
              <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>{item.time}</Text>

              {/* Progress Bar */}
              <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                <View style={{ height: '100%', width: `${item.progress * 100}%`, backgroundColor: '#3caea3', borderRadius: 3 }} />
              </View>

              {/* Avatars */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 10, color: '#9ca3af' }}>เพื่อนที่โหวตตัวเลือกนี้:</Text>
                <View style={{ flexDirection: 'row' }}>
                  {item.avatars.map((url, idx) => (
                    <Image key={idx} source={{ uri: url }} style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -6 }} />
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Submit Button */}
        <TouchableOpacity 
          onPress={() => router.push('/vote-result')}
          style={{ backgroundColor: '#217371', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10, elevation: 2 }}
        >
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>ยืนยันวันนัดที่ถูกเลือก 🏆</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>ผู้จัดงานเท่านั้นที่มีสิทธิ์สรุปโหวตครั้งนี้</Text>
      </ScrollView>
    </View>
  );
}