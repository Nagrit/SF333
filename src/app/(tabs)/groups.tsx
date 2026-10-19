import { useRouter } from 'expo-router';
import {
  Check,
  ChevronRight,
  Coffee,
  Flame,
  Folder,
  Heart,
  Laptop,
  Plus,
  Search,
  Smile,
  Sparkles,
  Star,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiFetch } from '../../services/api';

export interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export interface FriendRequest {
  senderId: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface GroupItem {
  id: string;
  name: string;
  icon: string;
  lastActive?: string;
  badgeText?: string;
  badgeType?: 'orange' | 'purple';
  membersCount: number;
  avatars: string[];
}

const getGroupIcon = (iconName: string) => {
  switch (iconName) {
    case 'laptop': return { Icon: Laptop, color: '#3caea3' };
    case 'heart': return { Icon: Heart, color: '#ed8b6e' };
    case 'star': return { Icon: Star, color: '#e0a96d' };
    case 'coffee': return { Icon: Coffee, color: '#a388cd' };
    case 'sparkles': return { Icon: Sparkles, color: '#468f92' };
    case 'smile': return { Icon: Smile, color: '#e08955' };
    case 'flame': return { Icon: Flame, color: '#ef4444' };
    default: return { Icon: Folder, color: '#468f92' };
  }
};

export default function GroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSubmittingFriend, setIsSubmittingFriend] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [groupsData, friendsData, requestsData] = await Promise.all([
        apiFetch<GroupItem[]>('/api/groups'),
        apiFetch<any[]>('/api/friends'),
        apiFetch<FriendRequest[]>('/api/friends/requests'),
      ]);

      setGroups(Array.isArray(groupsData) ? groupsData : []);

      // Defensive Mapping สำหรับรายชื่อเพื่อน
      if (Array.isArray(friendsData)) {
        const mappedFriends: Friend[] = friendsData.map((f) => ({
          id: f.id || '',
          name: f.name || f.displayName || 'ผู้ใช้งาน',
          username: f.username || '',
          avatar: f.avatar || f.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        }));
        setFriends(mappedFriends);
      } else {
        setFriends([]);
      }

      setPendingRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถโหลดข้อมูลกลุ่มและเพื่อนได้');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ส่งคำขอเป็นเพื่อนผ่าน Friend Code
  const handleAddFriendByCode = async () => {
    const code = friendCodeInput.trim().toUpperCase();
    if (!code) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรหัสเพื่อน (Friend Code)');
      return;
    }

    try {
      setIsSubmittingFriend(true);
      const response = await apiFetch<any>('/api/friends/add-by-code', {
        method: 'POST',
        body: JSON.stringify({ friendCode: code }),
      });

      Alert.alert('สำเร็จ!', response.message || 'ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว');
      setFriendCodeInput('');
      setIsAddFriendModalOpen(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถส่งคำขอเป็นเพื่อนได้');
    } finally {
      setIsSubmittingFriend(false);
    }
  };

  // ยอมรับคำขอเป็นเพื่อน
  const handleAcceptRequest = async (senderId: string) => {
    try {
      setProcessingRequestId(senderId);
      await apiFetch('/api/friends/accept', {
        method: 'PUT',
        body: JSON.stringify({ requesterId: senderId }),
      });

      Alert.alert('สำเร็จ', 'ตอบรับคำขอเป็นเพื่อนเรียบร้อยแล้ว');
      fetchData();
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถตอบรับคำขอเป็นเพื่อนได้');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // ปฏิเสธคำขอเป็นเพื่อน
  const handleRejectRequest = async (senderId: string) => {
    try {
      setProcessingRequestId(senderId);
      await apiFetch(`/api/friends/${senderId}`, { method: 'DELETE' });
      setPendingRequests((prev) => prev.filter((r) => r.senderId !== senderId));
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถปฏิเสธคำขอได้');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // ลบเพื่อน
  const handleRemoveFriend = (friendId: string, friendName: string) => {
    Alert.alert('ลบเพื่อน', `คุณต้องการลบ "${friendName}" ออกจากเพื่อนใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/friends/${friendId}`, { method: 'DELETE' });
            setFriends((prev) => prev.filter((f) => f.id !== friendId));
          } catch (error: any) {
            Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถลบเพื่อนได้');
          }
        },
      },
    ]);
  };

  // ค้นหาปลอดภัยจาก undefined/null
  const filteredGroups = (groups || []).filter((g) =>
    (g?.name || '').toLowerCase().includes((search || '').toLowerCase())
  );

  const filteredFriends = (friends || []).filter(
    (f) =>
      (f?.name || '').toLowerCase().includes((search || '').toLowerCase()) ||
      (f?.username || '').toLowerCase().includes((search || '').toLowerCase())
  );

  const headerPaddingTop =
    Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12;

  return (
    <View style={{ flex: 1, backgroundColor: '#dbe6e5' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View
        style={{
          backgroundColor: '#468f92',
          paddingHorizontal: 20,
          paddingTop: headerPaddingTop,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 22 }}>กลุ่มของฉัน</Text>
        <TouchableOpacity
          onPress={() => router.push('/create-group')}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 2,
            borderColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus color="#ffffff" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor="#468f92"
          />
        }
      >
        {/* Search Input */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 20,
          }}
        >
          <Search color="#70adb0" size={18} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ค้นหากลุ่มหรือเพื่อน..."
            placeholderTextColor="#9ca3af"
            style={{ flex: 1, marginLeft: 10, fontSize: 14, color: '#1f2937' }}
          />
        </View>

        {/* Section: Pending Friend Requests (แสดงเฉพาะเมื่อมีคำขอ) */}
        {pendingRequests.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <UserCheck size={18} color="#e08955" />
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#4a3b32' }}>
                  คำขอเป็นเพื่อน ({pendingRequests.length})
                </Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {pendingRequests.map((req) => (
                <View
                  key={req.senderId}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: 'rgba(224, 137, 85, 0.3)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Image
                      source={{
                        uri:
                          req.avatarUrl ||
                          'https://cdn-icons-png.flaticon.com/512/149/149071.png',
                      }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontWeight: 'bold', fontSize: 14, color: '#1f2937' }}
                        numberOfLines={1}
                      >
                        {req.displayName || 'ไม่ระบุชื่อ'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6b7280' }} numberOfLines={1}>
                        @{req.username || 'user'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {processingRequestId === req.senderId ? (
                      <ActivityIndicator size="small" color="#468f92" />
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => handleAcceptRequest(req.senderId)}
                          style={{
                            backgroundColor: '#468f92',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Check size={14} color="#ffffff" strokeWidth={3} />
                          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                            ยอมรับ
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRejectRequest(req.senderId)}
                          style={{
                            backgroundColor: '#f3f4f6',
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 8,
                          }}
                        >
                          <X size={14} color="#6b7280" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section: Friends */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{ fontWeight: 'bold', fontSize: 16, color: '#4a3b32', marginBottom: 12 }}
          >
            เพื่อนของฉัน ({filteredFriends.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, alignItems: 'center' }}
          >
            <TouchableOpacity
              onPress={() => setIsAddFriendModalOpen(true)}
              style={{ alignItems: 'center' }}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#ed8b6e',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                }}
              >
                <Plus color="#ed8b6e" size={22} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ed8b6e' }}>
                เพิ่มเพื่อน
              </Text>
            </TouchableOpacity>

            {filteredFriends.map((friend) => (
              <TouchableOpacity
                key={friend.id}
                onLongPress={() => handleRemoveFriend(friend.id, friend.name)}
                style={{ alignItems: 'center', width: 60 }}
              >
                <Image
                  source={{ uri: friend.avatar }}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: '#ffffff',
                  }}
                />
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, fontWeight: '500', color: '#374151', textAlign: 'center' }}
                >
                  {friend.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section: Groups */}
        <View>
          <Text
            style={{ fontWeight: 'bold', fontSize: 16, color: '#4a3b32', marginBottom: 12 }}
          >
            กลุ่มทั้งหมด
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#468f92" style={{ marginTop: 20 }} />
          ) : filteredGroups.length === 0 ? (
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>ไม่พบกลุ่มที่คุณค้นหา</Text>
            </View>
          ) : (
            filteredGroups.map((group) => {
              const { Icon: GroupIcon, color: iconColor } = getGroupIcon(group.icon);
              return (
                <TouchableOpacity
                  key={group.id}
                  onPress={() =>
                    router.push({
                      pathname: '/group-detail',
                      params: { id: group.id, name: group.name },
                    })
                  }
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(60,174,163,0.3)',
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 4,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      <GroupIcon size={18} color={iconColor} />
                      <Text
                        numberOfLines={1}
                        style={{ fontWeight: 'bold', fontSize: 16, color: '#1f2937', flex: 1 }}
                      >
                        {group.name}
                      </Text>
                    </View>
                    {group.badgeText && (
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor:
                            group.badgeType === 'orange' ? '#fdebe4' : '#f0e9f7',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: 'bold',
                            color: group.badgeType === 'orange' ? '#ed7d58' : '#9c71ce',
                          }}
                        >
                          {group.badgeText}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                    เคลื่อนไหวล่าสุด: {group.lastActive || 'เร็วๆ นี้'}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginRight: 8,
                        }}
                      >
                        {group.avatars?.map((url, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: url }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              borderWidth: 2,
                              borderColor: '#ffffff',
                              marginLeft: idx === 0 ? 0 : -10,
                            }}
                          />
                        ))}
                      </View>
                      <Text
                        style={{ fontSize: 12, fontWeight: 'bold', color: '#468f92' }}
                      >
                        สมาชิก {group.membersCount} คน
                      </Text>
                    </View>
                    <ChevronRight color="#ed8b6e" size={20} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal Add Friend by Code */}
      <Modal visible={isAddFriendModalOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              width: '100%',
              maxWidth: 320,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} color="#468f92" />
                <Text style={{ fontWeight: 'bold', color: '#1f2937', fontSize: 15 }}>
                  เพิ่มเพื่อนด้วยรหัส
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddFriendModalOpen(false)}>
                <X color="#9ca3af" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
              กรอกรหัสเพื่อน (เช่น FC-XXXXXX) เพื่อส่งคำขอเป็นเพื่อน
            </Text>

            <TextInput
              value={friendCodeInput}
              onChangeText={setFriendCodeInput}
              placeholder="กรอกรหัสเพื่อน เช่น FC-A1B2C3"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              style={{
                backgroundColor: '#f3f4f6',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 44,
                fontSize: 13,
                color: '#1f2937',
                marginBottom: 16,
              }}
            />

            <TouchableOpacity
              onPress={handleAddFriendByCode}
              disabled={isSubmittingFriend}
              style={{
                backgroundColor: '#468f92',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              {isSubmittingFriend ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                  ยืนยันส่งคำขอ
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}