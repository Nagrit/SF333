import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiFetch } from '../../services/api';

export interface NotificationItem {
  id: string;
  title: string;
  date: string;
  message: string;
  isUnread: boolean;
}

export interface ApiNotificationResponse {
  unreadCount?: number;
  data?: Array<{
    id: string;
    title: string;
    message: string;
    isRead?: boolean;
    createdAt?: string;
  }>;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch<ApiNotificationResponse | NotificationItem[]>('/api/notifications');

      let rawList: any[] = [];
      if (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) {
        rawList = res.data;
      } else if (Array.isArray(res)) {
        rawList = res;
      }

      // แมปข้อมูลจาก DB Schema (isRead, createdAt) เข้ากับ UI (isUnread, date)
      const mappedNotifications: NotificationItem[] = rawList.map((item) => ({
        id: item.id,
        title: item.title || 'Notification',
        message: item.message || '',
        date: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
            })
          : item.date || '',
        isUnread: typeof item.isUnread === 'boolean' ? item.isUnread : item.isRead === false,
      }));

      setNotifications(mappedNotifications);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถโหลดการแจ้งเตือนได้');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenNotification = async (item: NotificationItem) => {
  setSelectedNotif(item);

  if (!item.isUnread) return;

  // อัปเดตหน้าจอทันที
  setNotifications((prev) =>
    prev.map((n) =>
      n.id === item.id ? { ...n, isUnread: false } : n
    )
  );
  setSelectedNotif({ ...item, isUnread: false });

  try {
    await apiFetch(`/api/notifications/${item.id}/read`, {
      method: 'PUT',
    });
  } catch (error: any) {
    // หากบันทึกไม่สำเร็จ ให้โหลดสถานะจริงจาก Backend อีกครั้ง
    Alert.alert(
      'บันทึกสถานะไม่สำเร็จ',
      'ไม่สามารถบันทึกสถานะการอ่านได้ กรุณาลองใหม่'
    );
    await fetchNotifications();
  }
};

  const handleDeleteAll = async () => {
    try {
      // ลบทีละรายการ หรือเรียก Clear Endpoint
      await Promise.all(
        notifications.map((n) => apiFetch(`/api/notifications/${n.id}`, { method: 'DELETE' }))
      );
      setNotifications([]);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถลบการแจ้งเตือนทั้งหมดได้');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setSelectedNotif(null);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถลบการแจ้งเตือนนี้ได้');
    }
  };

  const headerPaddingTop =
    Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 8;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="light-content" backgroundColor="#468f92" translucent={true} />

      {/* Header */}
      <View
        style={{
          backgroundColor: '#468f92',
          paddingHorizontal: 20,
          paddingBottom: 16,
          paddingTop: headerPaddingTop,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (selectedNotif) {
              setSelectedNotif(null);
            } else {
              router.back();
            }
          }}
          style={{ paddingRight: 12 }}
        >
          <ArrowLeft color="#ffffff" size={22} />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>
          {selectedNotif ? 'การแจ้งเตือน' : 'การแจ้งเตือน'}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#468f92" />
        </View>
      ) : selectedNotif ? (
        <View style={{ flex: 1, backgroundColor: '#eef5f4', padding: 16 }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              elevation: 1,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#217371',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Calendar color="#ffffff" size={20} />
                </View>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#374151' }}>
                  {selectedNotif.title}
                </Text>
              </View>

              <TouchableOpacity onPress={() => handleDeleteItem(selectedNotif.id)}>
                <Trash2 color="#e08955" size={20} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: '#4a3b32',
                marginBottom: 6,
              }}
            >
              {selectedNotif.date}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18 }}>
              {selectedNotif.message}
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {(notifications || []).length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 32,
              }}
            >
              <Text style={{ fontSize: 90, lineHeight: 100, marginBottom: 20 }}>📬</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#4a3b32',
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                ยังไม่มีการแจ้งเตือน
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#6b7280',
                  textAlign: 'center',
                  lineHeight: 18,
                  marginBottom: 24,
                }}
              >
                คุณสามารถกลับมาดูการแจ้งเตือนได้ใหม่ภายหลัง 
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4a3b32' }}>
                  Previously
                </Text>
                <TouchableOpacity onPress={handleDeleteAll}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ed8b6e' }}>
                    Delete all
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {(notifications || []).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleOpenNotification(item)}
                    style={{
                      backgroundColor: '#eef5f4',
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Calendar color="#217371" size={18} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 2,
                        }}
                      >
                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#374151' }}>
                          {item.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: 'bold',
                              color: '#4a3b32',
                              marginRight: 4,
                            }}
                          >
                            {item.date}
                          </Text>
                          {item.isUnread && (
                            <View
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 2.5,
                                backgroundColor: '#468f92',
                              }}
                            />
                          )}
                        </View>
                      </View>
                      <Text
                        style={{ fontSize: 11, color: '#6b7280', lineHeight: 15 }}
                        numberOfLines={2}
                      >
                        {item.message}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
}