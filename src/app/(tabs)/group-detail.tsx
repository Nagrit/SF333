import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Plus, Settings, Share2, Trash2, UserMinus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase Imports
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

interface GroupAppointment {
  id: string;
  title: string;
  category?: string;
  dateText: string;
  location?: string;
  creator: string;
  headerBg: string;
  isVote?: boolean;
  statusText?: string;
  statusBg?: string;
  statusColor?: string;
  avatars?: string[];
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const currentUser = auth.currentUser;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const groupId = (params.id as string) || '';
  const [groupName, setGroupName] = useState((params.name as string) || 'ทีมออฟฟิศ 💻');
  const [groupData, setGroupData] = useState<any>(null);
  const [appointments, setAppointments] = useState<GroupAppointment[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal สำหรับตั้งค่า/แก้ไขกลุ่ม
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState(groupName);
  const [allowMemberInvite, setAllowMemberInvite] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const inviteLink = Linking.createURL('/join', {
    scheme: 'calendarsf333',
    queryParams: { group: groupId },
  });

  // ดึงข้อมูลกลุ่ม, สมาชิก และนัดหมายจาก Firestore
  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        setIsLoading(true);

        if (groupId) {
          const groupDocRef = doc(db, 'groups', groupId);
          const groupDocSnap = await getDoc(groupDocRef);
          if (groupDocSnap.exists()) {
            const data = groupDocSnap.data();
            setGroupData(data);
            setGroupName(data.name);
            setEditGroupName(data.name);
            setAllowMemberInvite(data.allowMemberInvite ?? true);

            // ดึงข้อมูลโปรไฟล์ของสมาชิกในกลุ่ม
            if (data.members && Array.isArray(data.members)) {
              const membersList: any[] = [];
              for (const memberUid of data.members) {
                const userDoc = await getDoc(doc(db, 'users', memberUid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  membersList.push({
                    id: memberUid,
                    name: userData.name || 'สมาชิก',
                    username: userData.username || '',
                    avatar: userData.avatar || `https://picsum.photos/seed/${memberUid}/100`,
                  });
                }
              }
              setGroupMembers(membersList);
            }
          }
        }

        // ดึงนัดหมายของกลุ่ม
        const q = query(collection(db, 'appointments'), where('groupId', '==', groupId));
        const querySnapshot = await getDocs(q);
        const loadedAppointments: GroupAppointment[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedAppointments.push({
            id: docSnap.id,
            title: data.title || 'นัดหมาย',
            category: data.category || '🍔นัดกินข้าว',
            dateText: data.dateText || 'เร็วๆ นี้',
            location: data.location || 'สถานที่นัดหมาย',
            creator: data.creator || 'สมาชิก',
            headerBg: data.headerBg || '#a1c2be',
            isVote: data.isVote || false,
            statusText: data.statusText || (data.isVote ? 'รอการยืนยัน' : 'ยืนยันแล้ว'),
            avatars: data.avatars || ['https://picsum.photos/seed/1/100', 'https://picsum.photos/seed/2/100']
          });
        });

        if (loadedAppointments.length === 0) {
          setAppointments([
            {
              id: '1',
              title: 'ชาบูกับชาวแก๊งค์ 🍲',
              category: '🍔นัดกินข้าว',
              dateText: 'วันเสาร์ 21 ก.พ. 2026 (18.00-21.00 น.)',
              location: 'ร้าน Shabu Baru (Siam Paragon)',
              creator: 'ทิฟ',
              headerBg: '#ffffff',
              isVote: true,
              statusText: 'รอการยืนยัน',
            },
            {
              id: '2',
              title: 'ชาบูกับชาวแก๊งค์ 🍲',
              category: '🍔นัดกินข้าว',
              dateText: 'วันเสาร์ 21 ก.พ. 2026 (18.00-21.00 น.)',
              location: 'ร้าน Shabu Baru (Siam Paragon)',
              creator: 'ทิฟ',
              headerBg: '#ffffff',
              isVote: false,
              statusText: 'ยืนยันแล้ว',
            },
          ]);
        } else {
          setAppointments(loadedAppointments);
        }
      } catch (error) {
        console.log('Error fetching group details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupDetails();
  }, [groupId]);

  // ฟังก์ชันบันทึกการแก้ไขชื่อกลุ่มและการตั้งค่าสิทธิ์
  const handleUpdateGroup = async () => {
    if (!editGroupName.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อกลุ่ม');
      return;
    }

    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'groups', groupId), {
        name: editGroupName.trim(),
        allowMemberInvite: allowMemberInvite
      });

      setGroupName(editGroupName.trim());
      setIsSettingsModalOpen(false);
      Alert.alert('สำเร็จ', 'อัปเดตข้อมูลกลุ่มเรียบร้อยแล้ว');
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตกลุ่มได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ฟังก์ชันกดเปิด Modal แชร์ลิงก์ (ตรวจสอบสิทธิ์ว่าอนุญาตให้สมาชิกแชร์ไหม)
  const handleOpenShareModal = () => {
    const isUserOwner = groupData?.createdBy === currentUser?.uid;
    const canInvite = isUserOwner || groupData?.allowMemberInvite !== false;

    if (!canInvite) {
      Alert.alert('ไม่อนุญาต', 'เจ้าของกลุ่มตั้งค่าให้เฉพาะเจ้าของกลุ่มสามารถแชร์ลิงก์เชิญเข้ากลุ่มได้เท่านั้น');
      return;
    }
    setIsShareModalOpen(true);
  };

  // ฟังก์ชันแชร์ลิงก์ทันทีผ่านระบบ Native Share
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


  // ฟังก์ชันลบสมาชิกออกจากกลุ่ม
  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (memberId === groupData?.createdBy) {
      Alert.alert('แจ้งเตือน', 'ไม่สามารถลบเจ้าของกลุ่มได้');
      return;
    }

    Alert.alert(
      'ลบสมาชิก',
      `คุณต้องการนำ "${memberName}" ออกจากกลุ่มใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedMembers = groupData.members.filter((id: string) => id !== memberId);
              await updateDoc(doc(db, 'groups', groupId), {
                members: updatedMembers,
                membersCount: updatedMembers.length,
              });

              setGroupMembers(prev => prev.filter(m => m.id !== memberId));
              setGroupData((prev: any) => ({ ...prev, members: updatedMembers, membersCount: updatedMembers.length }));
              Alert.alert('สำเร็จ', `นำ ${memberName} ออกจากกลุ่มแล้ว`);
            } catch (error) {
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบสมาชิกได้');
            }
          }
        }
      ]
    );
  };

  // ฟังก์ชันลบกลุ่ม
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
              await deleteDoc(doc(db, 'groups', groupId));
              Alert.alert('สำเร็จ', 'ลบกลุ่มเรียบร้อยแล้ว', [
                { text: 'ตกลง', onPress: () => router.back() }
              ]);
            } catch (error) {
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบกลุ่มได้');
            }
          }
        }
      ]
    );
  };

  const isOwner = groupData && currentUser && groupData.createdBy === currentUser.uid;

  const voteAppointments = appointments.filter(i => i.isVote);
  const normalAppointments = appointments.filter(i => !i.isVote);


  return (
    <View style={{ flex: 1, backgroundColor: '#dbe6e5' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View
        style={{
          backgroundColor: '#468f92',
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
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
              <Text style={{ fontSize: 16 }}>💻</Text>
            </View>
            <Text style={{ color: '#e0f2f1', fontSize: 12, marginTop: 2 }}>
              สมาชิก {groupMembers.length} คน
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* ปุ่มแชร์ (เปิด Modal ชวนเพื่อน) */}
          <TouchableOpacity onPress={handleOpenShareModal} style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
            <Share2 color="#ffffff" size={18} />
          </TouchableOpacity>

          {/* ปุ่มตั้งค่า (เฉพาะผู้สร้างกลุ่ม) */}
          {isOwner && (
            <TouchableOpacity onPress={() => setIsSettingsModalOpen(true)} style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
              <Settings color="#ffffff" size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#468f92" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 90 }}
        >
          {/* หมวดหมู่: โหวตเวลาหนัดหมาย */}
          {voteAppointments.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155' }}>โหวตเวลานัดหมาย</Text>
                <Text style={{ fontSize: 14 }}>👍</Text>
              </View>

              {voteAppointments.map((item) => (
                <View key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#d97706' }}>{item.category}</Text>
                    </View>
                    <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#4b5563' }}>❓ {item.statusText}</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>{item.title}</Text>
                  <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 6 }}>{item.dateText}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <MapPin size={14} color="#6b7280" />
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.location}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => router.push('/vote-appointment' as any)}
                    >
                      <Text style={{ color: '#217371', fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' }}>เปิดโหวตเวลา</Text>
                    </TouchableOpacity>

                    {/* แสดงรูปโปรไฟล์สมาชิกย่อ */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#fff' }} />
                      <Image source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#fff', marginLeft: -8 }} />
                      <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#fff', marginLeft: -8 }} />
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderWidth: 1.5, borderColor: '#fff' }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>+2</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* หมวดหมู่: นัดหมายเร็วๆ นี้ */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155' }}>นัดหมายเร็วๆ นี้ ({normalAppointments.length})</Text>
            <Text style={{ fontSize: 14 }}>📅</Text>
          </View>

          {normalAppointments.map((item) => (
            <View key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#d97706' }}>{item.category}</Text>
                </View>
                <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#15803d' }}>✅ {item.statusText}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>{item.title}</Text>
              <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 6 }}>{item.dateText}</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <MapPin size={14} color="#6b7280" />
                <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.location}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => router.push('/appointment-detail' as any)}
                >
                  <Text style={{ color: '#217371', fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' }}>ดูรายละเอียดนัดหมาย</Text>
                </TouchableOpacity>

                {/* แสดงรูปโปรไฟล์สมาชิกย่อ */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#fff' }} />
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#fff', marginLeft: -8 }} />
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#fff', marginLeft: -8 }} />
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderWidth: 1.5, borderColor: '#fff' }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>+2</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        onPress={() => router.push('/create-appointment' as any)}
        style={{
          position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26,
          backgroundColor: '#468f92', alignItems: 'center', justifyContent: 'center', elevation: 5
        }}
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
              marginBottom: 20
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
                  alignItems: 'center'
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
                shadowColor: '#1C4E4E',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3
              }}
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
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>บันทึกการแก้ไข</Text>
                )}
              </TouchableOpacity>

              {/* รายชื่อสมาชิกในกลุ่ม */}
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 8 }}>สมาชิกในกลุ่ม ({groupMembers.length} คน)</Text>
              <View style={{ gap: 8, marginBottom: 20 }}>
                {groupMembers.map((member) => (
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