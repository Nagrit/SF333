import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Calendar } from 'lucide-react-native';

interface NotificationItem {
  id: string;
  title: string;
  date: string;
  message: string;
  isUnread: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Friends Calendar',
    date: 'Feb 12, 2026',
    message: 'Keep paying with Friends to welcome your friend to see in Monday',
    isUnread: true,
  },
  {
    id: '2',
    title: 'Friends Calendar',
    date: 'Feb 12, 2026',
    message: 'Keep paying with Friends to welcome your friend to see in Monday',
    isUnread: false,
  },
  {
    id: '3',
    title: 'Friends Calendar',
    date: 'Feb 12, 2026',
    message: 'Keep paying with Friends to welcome your friend to see in Monday',
    isUnread: false,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  // ฟังก์ชันลบทั้งหมด
  const handleDeleteAll = () => {
    setNotifications([]);
  };

  // ฟังก์ชันลบรายการเดียวในหน้า Detail
  const handleDeleteItem = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setSelectedNotif(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="light-content" backgroundColor="#468f92" translucent={true} />

      {/* Header สีเขียวทีล */}
      <View 
        style={{ 
          backgroundColor: '#468f92', 
          paddingHorizontal: 20, 
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 8, 
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <TouchableOpacity 
          onPress={() => {
            if (selectedNotif) {
              setSelectedNotif(null); // ย้อนกลับไปหน้ารายการ
            } else {
              router.back(); // ย้อนกลับไปหน้าก่อนหน้า
            }
          }}
          style={{ paddingRight: 12 }}
        >
          <ArrowLeft color="#ffffff" size={22} />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>
          {selectedNotif ? 'Notification' : 'Notifications'}
        </Text>
      </View>

      {/* 1. STATE 3: หน้าแสดงรายละเอียดการแจ้งเตือน (Detail View) */}
      {selectedNotif ? (
        <View style={{ flex: 1, backgroundColor: '#eef5f4', padding: 16 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20, elevation: 1 }}>
            {/* ส่วนหัวการ์ดใน Detail */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#217371', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Calendar color="#ffffff" size={20} />
                </View>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#374151' }}>
                  {selectedNotif.title}
                </Text>
              </View>

              {/* ปุ่มลบถังขยะสีส้ม */}
              <TouchableOpacity onPress={() => handleDeleteItem(selectedNotif.id)}>
                <Trash2 color="#e08955" size={20} />
              </TouchableOpacity>
            </View>

            {/* วันที่และข้อความรายละเอียด */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4a3b32', marginBottom: 6 }}>
              {selectedNotif.date}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18 }}>
              {selectedNotif.message}
            </Text>
          </View>
        </View>
      ) : (
        /* 2. STATE 1 & 2: หน้ารวมรายการ หรือ หน้าไม่มีการแจ้งเตือน */
        <View style={{ flex: 1 }}>
          {notifications.length === 0 ? (
            /* STATE 1: Empty State (ไม่มีการแจ้งเตือน) */
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
              <View style={{ marginBottom: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 90, lineHeight: 100 }}>📬</Text>
              </View>
              
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4a3b32', marginBottom: 8, textAlign: 'center' }}>
                No notification yet
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18, marginBottom: 24 }}>
                Your notification will appear here once you've received them
              </Text>

              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#468f92', marginBottom: 4 }}>
                  Missing notification?
                </Text>
                <TouchableOpacity>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#3caea3', textDecorationLine: 'underline' }}>
                    Go to setting
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* STATE 2: List State (มีรายการแจ้งเตือน) */
            <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
              {/* แถบหัวข้อ Previously & Delete All */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4a3b32' }}>Previously</Text>
                <TouchableOpacity onPress={handleDeleteAll}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ed8b6e' }}>Delete all</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedNotif(item)}
                    style={{
                      backgroundColor: '#eef5f4',
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'flex-start'
                    }}
                  >
                    {/* ไอคอนทรงกลม */}
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Calendar color="#217371" size={18} />
                    </View>

                    {/* รายละเอียด */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#374151' }}>
                          {item.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#4a3b32', marginRight: 4 }}>
                            {item.date}
                          </Text>
                          {item.isUnread && (
                            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#468f92' }} />
                          )}
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: '#6b7280', lineHeight: 15 }} numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Missing notification ด้านล่าง */}
                <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 24 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#468f92', marginBottom: 4 }}>
                    Missing notification?
                  </Text>
                  <TouchableOpacity>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#3caea3', textDecorationLine: 'underline' }}>
                      Go to setting
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
}