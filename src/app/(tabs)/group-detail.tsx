import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Plus, Settings, Share2, Trash2, UserMinus, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/api';

export interface GroupAppointment {
  id: string;
  title: string;
  category?: string;
  dateText: string;
  location?: string;
  creator: string;
  headerBg?: string;
  isVote?: boolean;
  statusText?: string;
  avatars?: string[];
}

export interface GroupMember {
  id: string;
  name: string;
  username?: string;
  avatar: string;
}

export interface GroupData {
  id: string;
  name: string;
  createdBy: string;
  allowMemberInvite?: boolean;
  members: GroupMember[];
}

export interface CurrentUser {
  id: string;
  name: string;
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const groupId = (params.id as string) || '';

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [groupName, setGroupName] = useState<string>((params.name as string) || '');
  const [appointments, setAppointments] = useState<GroupAppointment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal แชร์ลิงก์
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modal ตั้งค่า/แก้ไขกลุ่ม
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [allowMemberInvite, setAllowMemberInvite] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const inviteLink = Linking.createURL('/join', {
    scheme: 'calendarsf333',
    queryParams: { group: groupId },
  });

  // ดึงข้อมูลผู้ใช้ปัจจุบัน ข้อมูลกลุ่ม และนัดหมายจาก Fastify API
  const fetchGroupData = useCallback(async () => {
    if (!groupId) return;

    try {
      const [meRes, groupRes, appRes] = await Promise.all([
        apiFetch<any>('/api/auth/me').catch(() => null),
        apiFetch<any>(`/api/groups/${groupId}`).catch(() => null),
        apiFetch<any[]>(`/api/groups/${groupId}/appointments`).catch(() => []),
      ]);

      if (meRes) {
        setCurrentUser({
          id: meRes.id || '',
          name: meRes.name || meRes.displayName || 'ผู้ใช้งาน',
        });
      }

      if (groupRes) {
        const formattedMembers: GroupMember[] = Array.isArray(groupRes.members)
          ? groupRes.members.map((m: any) => ({
              id: m.id || '',
              name: m.name || m.displayName || 'สมาชิก',
              username: m.username || '',
              avatar: m.avatar || m.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            }))
          : [];

        const formattedGroup: GroupData = {
          id: groupRes.id || groupId,
          name: groupRes.name || (params.name as string) || 'กลุ่ม',
          createdBy: groupRes.createdBy || groupRes.createdById || '',
          allowMemberInvite: groupRes.allowMemberInvite ?? true,
          members: formattedMembers,
        };

        setGroupData(formattedGroup);
        setGroupName(formattedGroup.name);
        setEditGroupName(formattedGroup.name);
        setAllowMemberInvite(formattedGroup.allowMemberInvite ?? true);
      }

      if (Array.isArray(appRes)) {
        setAppointments(
          appRes.map((app: any) => ({
            id: app.id || '',
            title: app.title || 'นัดหมาย',
            category: app.category || 'ทั่วไป',
            dateText: app.dateText || 'ไม่ระบุวันเวลา',
            location: app.location || '',
            creator: app.creator || 'สมาชิก',
            isVote: app.isVote ?? false,
            statusText: app.statusText || (app.isVote ? 'รอโหวต' : 'ยืนยันแล้ว'),
            avatars: Array.isArray(app.avatars) ? app.avatars : [],
          }))
        );
      }
    } catch (error: any) {
      console.error('Error fetching group details:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [groupId, params.name]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchGroupData();
  };

  // บันทึกการแก้ไขข้อมูลกลุ่ม
  const handleUpdateGroup = async () => {
    if (!editGroupName.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อกลุ่ม');
      return;
    }

    try {
      setIsSaving(true);
      await apiFetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editGroupName.trim(),
          allowMemberInvite,
        }),
      });

      setGroupName(editGroupName.trim());
      setGroupData((prev) =>
        prev ? { ...prev, name: editGroupName.trim(), allowMemberInvite } : null
      );
      setIsSettingsModalOpen(false);
      Alert.alert('สำเร็จ', 'อัปเดตข้อมูลกลุ่มเรียบร้อยแล้ว');
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถอัปเดตกลุ่มได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenShareModal = () => {
    const isUserOwner = groupData?.createdBy === currentUser?.id;
    const canInvite = isUserOwner || groupData?.allowMemberInvite !== false;

    if (!canInvite) {
      Alert.alert('ไม่อนุญาต', 'เจ้าของกลุ่มตั้งค่าให้เฉพาะเจ้าของกลุ่มสามารถแชร์ลิงก์เชิญเข้ากลุ่มได้เท่านั้น');
      return;
    }
    setIsShareModalOpen(true);
  };

  const handleShareGroup = async () => {
    try {
      await Share.share({
        message: `มาร่วมกลุ่ม "${groupName}" ใน Friends Calendar กันเถอะ!\nลิงก์คำเชิญ: ${inviteLink}`,
      });
      setIsShareModalOpen(false);
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถแชร์ลิงก์ได้');
    }
  };

  // ลบสมาชิกออกจากกลุ่ม
  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (memberId === groupData?.createdBy) {
      Alert.alert('แจ้งเตือน', 'ไม่สามารถลบเจ้าของกลุ่มได้');
      return;
    }

    Alert.alert('ลบสมาชิก', `คุณต้องการนำ "${memberName}" ออกจากกลุ่มใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/groups/${groupId}/members/${memberId}`, {
              method: 'DELETE',
            });

            setGroupData((prev) =>
              prev
                ? {
                    ...prev,
                    members: prev.members.filter((m) => m.id !== memberId),
                  }
                : null
            );

            Alert.alert('สำเร็จ', `นำ ${memberName} ออกจากกลุ่มแล้ว`);
          } catch (error: any) {
            Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถลบสมาชิกได้');
          }
        },
      },
    ]);
  };

  // ลบกลุ่ม
  const handleDeleteGroup = () => {
    Alert.alert(
      'ลบกลุ่ม',
      `คุณต้องการลบกลุ่ม "${groupName}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบกลุ่ม',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/groups/${groupId}`, {
                method: 'DELETE',
              });
              Alert.alert('สำเร็จ', 'ลบกลุ่มเรียบร้อยแล้ว', [
                { text: 'ตกลง', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถลบกลุ่มได้');
            }
          },
        },
      ]
    );
  };

  const isOwner = Boolean(groupData && currentUser && groupData.createdBy === currentUser.id);

  const voteAppointments = appointments.filter((i) => i.isVote);
  const normalAppointments = appointments.filter((i) => !i.isVote);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#dbe6e5', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

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
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft color="#ffffff" size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text numberOfLines={1} style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>
                {groupName}
              </Text>
            </View>
            <Text style={{ color: '#e0f2f1', fontSize: 12, marginTop: 2 }}>
              สมาชิก {groupData?.members?.length || 0} คน
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={handleOpenShareModal} style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
            <Share2 color="#ffffff" size={18} />
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity onPress={() => setIsSettingsModalOpen(true)} style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
              <Settings color="#ffffff" size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#468f92" />}
      >
        {/* หมวดหมู่: โหวตเวลานัดหมาย */}
        {voteAppointments.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155' }}>โหวตเวลานัดหมาย</Text>
              <Text style={{ fontSize: 14 }}>👍</Text>
            </View>

            {voteAppointments.map((item) => (
              <View key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {item.category ? (
                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#d97706' }}>{item.category}</Text>
                    </View>
                  ) : null}
                  <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#4b5563' }}>❓ {item.statusText || 'รอการยืนยัน'}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>{item.title}</Text>
                <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 6 }}>{item.dateText}</Text>

                {item.location ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <MapPin size={14} color="#6b7280" />
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.location}</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/vote-appointment', params: { id: item.id } })}>
                    <Text style={{ color: '#217371', fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' }}>
                      เปิดโหวตเวลา
                    </Text>
                  </TouchableOpacity>

                  {item.avatars && item.avatars.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {item.avatars.slice(0, 3).map((url, idx) => (
                        <Image
                          key={idx}
                          source={{ uri: url }}
                          style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -8 }}
                        />
                      ))}
                      {item.avatars.length > 3 && (
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderWidth: 1.5, borderColor: '#ffffff' }}>
                          <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: 'bold' }}>+{item.avatars.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {/* หมวดหมู่: นัดหมายเร็วๆ นี้ */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155' }}>
            นัดหมายเร็วๆ นี้ ({normalAppointments.length})
          </Text>
          <Text style={{ fontSize: 14 }}>📅</Text>
        </View>

        {normalAppointments.length === 0 ? (
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ color: '#9ca3af', fontSize: 13 }}>ไม่มีนัดหมายในขณะนี้</Text>
          </View>
        ) : (
          normalAppointments.map((item) => (
            <View key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {item.category ? (
                  <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#d97706' }}>{item.category}</Text>
                  </View>
                ) : null}
                <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#15803d' }}>✅ {item.statusText || 'ยืนยันแล้ว'}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>{item.title}</Text>
              <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 6 }}>{item.dateText}</Text>

              {item.location ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <MapPin size={14} color="#6b7280" />
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.location}</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/appointment-detail', params: { id: item.id } })}>
                  <Text style={{ color: '#217371', fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' }}>
                    ดูรายละเอียดนัดหมาย
                  </Text>
                </TouchableOpacity>

                {item.avatars && item.avatars.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {item.avatars.slice(0, 3).map((url, idx) => (
                      <Image
                        key={idx}
                        source={{ uri: url }}
                        style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -8 }}
                      />
                    ))}
                    {item.avatars.length > 3 && (
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderWidth: 1.5, borderColor: '#ffffff' }}>
                        <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: 'bold' }}>+{item.avatars.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/create-appointment', params: { groupId } })}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#468f92',
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 5,
        }}
        activeOpacity={0.85}
      >
        <Plus color="#ffffff" size={28} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Modal ชวนเพื่อนเข้ากลุ่ม */}
      <Modal visible={isShareModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <View>
                <Text style={{ fontWeight: '800', color: '#1C4E4E', fontSize: 20 }}>ชวนเพื่อนเข้ากลุ่ม</Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>กลุ่ม: {groupName}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsShareModalOpen(false)} style={{ padding: 4 }}>
                <X color="#1C4E4E" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#475569', marginVertical: 12, lineHeight: 18 }}>
              คัดลอกลิงก์หรือส่งต่อไปยัง LINE, Messenger หรือ แชทเพื่อน
            </Text>

            <View style={{
              borderWidth: 1,
              borderColor: '#cbd5e1',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              marginBottom: 20,
            }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>ลิงก์คำเชิญเข้าร่วมกลุ่ม</Text>
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: 'bold', color: '#1C4E4E' }}>
                  {inviteLink}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleCopyLink}
                style={{
                  backgroundColor: '#94b8b8',
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Share2 color="#ffffff" size={20} />
              </TouchableOpacity>
            </View>

            {copied && (
              <Text style={{ color: '#10b981', fontSize: 12, textAlign: 'center', marginTop: -12, marginBottom: 12, fontWeight: 'bold' }}>
                คัดลอกลิงก์เรียบร้อยแล้ว! ✨
              </Text>
            )}

            <TouchableOpacity
              onPress={handleShareGroup}
              style={{
                backgroundColor: '#1C4E4E',
                flexDirection: 'row',
                height: 50,
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                elevation: 3,
              }}
              activeOpacity={0.8}
            >
              <Share2 color="#ffffff" size={20} />
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 }}>แชร์ทันที</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal ตั้งค่ากลุ่ม (เฉพาะเจ้าของกลุ่ม) */}
      <Modal visible={isSettingsModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 340, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', color: '#1f2937', fontSize: 16 }}>ตั้งค่ากลุ่ม</Text>
              <TouchableOpacity onPress={() => setIsSettingsModalOpen(false)}>
                <X color="#9ca3af" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 6 }}>ชื่อกลุ่ม</Text>
              <TextInput
                value={editGroupName}
                onChangeText={setEditGroupName}
                style={{ backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, height: 44, fontSize: 14, color: '#1f2937', marginBottom: 16 }}
              />

              {/* ตั้งค่าสิทธิ์การแชร์ลิงก์เข้ากลุ่ม */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#334155' }}>อนุญาตให้สมาชิกแชร์ลิงก์เชิญเข้ากลุ่มได้</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>ถ้าปิด จะให้เฉพาะเจ้าของกลุ่มแชร์ลิงก์ได้เท่านั้น</Text>
                </View>
                <Switch
                  value={allowMemberInvite}
                  onValueChange={setAllowMemberInvite}
                  trackColor={{ false: '#cbd5e1', true: '#468f92' }}
                  thumbColor={'#ffffff'}
                />
              </View>

              <TouchableOpacity
                onPress={handleUpdateGroup}
                disabled={isSaving}
                style={{ backgroundColor: '#468f92', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 20 }}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>บันทึกการแก้ไข</Text>
                )}
              </TouchableOpacity>

              {/* รายชื่อสมาชิกในกลุ่ม */}
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 8 }}>
                สมาชิกในกลุ่ม ({groupData?.members?.length || 0} คน)
              </Text>
              <View style={{ gap: 8, marginBottom: 20 }}>
                {groupData?.members?.map((member) => (
                  <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', padding: 8, borderRadius: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Image source={{ uri: member.avatar }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>
                          {member.name} {member.id === groupData?.createdBy ? '(เจ้าของกลุ่ม)' : ''}
                        </Text>
                      </View>
                    </View>

                    {member.id !== groupData?.createdBy && (
                      <TouchableOpacity onPress={() => handleRemoveMember(member.id, member.name)} style={{ padding: 6 }}>
                        <UserMinus size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => {
                  setIsSettingsModalOpen(false);
                  handleDeleteGroup();
                }}
                style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fef2f2' }}
                activeOpacity={0.8}
              >
                <Trash2 size={16} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 13 }}>ลบกลุ่มนี้</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}