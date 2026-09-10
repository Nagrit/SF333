import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Platform,
  Image 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Bell, Shield, CircleHelp, LogOut, ChevronRight, Settings } from 'lucide-react-native';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  const MENU_ITEMS = [
    { id: '1', title: 'แก้ไขข้อมูลส่วนตัว', icon: User, color: '#468f92' },
    { id: '2', title: 'ตั้งค่าการแจ้งเตือน', icon: Bell, color: '#e08955' },
    { id: '3', title: 'ความเป็นส่วนตัวและความปลอดภัย', icon: Shield, color: '#3caea3' },
    { id: '4', title: 'ช่วยเหลือและสนับสนุน', icon: CircleHelp, color: '#a388cd' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#cce1de' }}>
      <StatusBar barStyle="light-content" backgroundColor="#468f92" translucent={true} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View 
          style={{ 
            backgroundColor: '#468f92', 
            paddingHorizontal: 20, 
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12, 
            paddingBottom: 36, 
            borderBottomLeftRadius: 28, 
            borderBottomRightRadius: 28,
            alignItems: 'center'
          }}
        >
          <Image 
            source={{ uri: 'https://picsum.photos/seed/user1/200' }} 
            style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#ffffff', marginBottom: 12 }}
          />
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 2 }}>คุณนภัส (บอส)</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>naphat.boss@example.com</Text>
        </View>

        {/* Stats Card */}
        <View style={{ marginHorizontal: 20, marginTop: -20, backgroundColor: '#ffffff', borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-around', elevation: 2 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#468f92' }}>4</Text>
            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>กลุ่มของฉัน</Text>
          </View>
          <View style={{ width: 1, height: '100%', backgroundColor: '#f3f4f6' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#e08955' }}>12</Text>
            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>นัดหมายเดือนนี้</Text>
          </View>
          <View style={{ width: 1, height: '100%', backgroundColor: '#f3f4f6' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#3caea3' }}>100%</Text>
            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>การตอบรับ</Text>
          </View>
        </View>

        {/* Menu List */}
        <View style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: '#ffffff', borderRadius: 20, padding: 8 }}>
          {MENU_ITEMS.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity 
                key={item.id}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justify: 'space-between', 
                  paddingVertical: 14, 
                  paddingHorizontal: 12,
                  borderBottomWidth: index === MENU_ITEMS.length - 1 ? 0 : 1,
                  borderColor: '#f3f4f6'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${item.color}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <IconComponent color={item.color} size={18} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>{item.title}</Text>
                </View>
                <ChevronRight color="#9ca3af" size={18} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={{ 
            marginHorizontal: 20, 
            marginTop: 16, 
            marginBottom: 28, 
            backgroundColor: '#ffffff', 
            borderRadius: 16, 
            paddingVertical: 14, 
            flexDirection: 'row', 
            alignItems: 'center', 
            justify: 'center' 
          }}
        >
          <LogOut color="#f87171" size={18} />
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#f87171', marginLeft: 8 }}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}