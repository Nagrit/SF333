import * as Clipboard from 'expo-clipboard';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  Bell,
  Camera,
  ChevronRight,
  CircleHelp,
  Copy,
  HelpCircle,
  Lock,
  LogOut,
  Mail,
  Shield,
  User,
  X
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/api';

export interface UserProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  friendCode: string;
  avatar: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [activeModal, setActiveModal] = useState<'1' | '2' | '3' | '4' | null>(null);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [notiAppointments, setNotiAppointments] = useState(true);
  const [notiGroups, setNotiGroups] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const userData = await apiFetch<UserProfileData>('/api/auth/me');
        setProfile(userData);
        setEditName(userData.name);
        setEditEmail(userData.email);
      } catch (error: any) {
        Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleCopyFriendCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('คัดลอกแล้ว', `คัดลอกรหัส ${code} ไปยังคลิปบอร์ดเรียบร้อยแล้ว`);
  };


  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'การเข้าถึงถูกปฏิเสธ',
          'กรุณาอนุญาตการเข้าถึงรูปภาพในตั้งค่าเครื่อง',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const asset = result.assets[0];

      setIsUpdatingAvatar(true);

      const formData = new FormData();
      formData.append('avatar', new File(asset.uri) as any);

      const updated = await apiFetch<UserProfileData>(
        '/api/user/profile/avatar',
        {
          method: 'POST',
          body: formData,
        },
      );

      setProfile(updated);

      Alert.alert(
        'สำเร็จ',
        'บันทึกรูปโปรไฟล์เรียบร้อยแล้ว',
      );
    } catch (error: any) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        error.message || 'ไม่สามารถอัปเดตรูปโปรไฟล์ได้',
      );
    } finally {
      setIsUpdatingAvatar(false);
    }
  };


  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      const updated = await apiFetch<UserProfileData>('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: editName, email: editEmail })
      });
      setProfile(updated);
      setActiveModal(null);
      Alert.alert('สำเร็จ', 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          router.replace('/login');
        }
      }
    ]);
  };

  const MENU_ITEMS = [
    { id: '1', title: 'แก้ไขข้อมูลส่วนตัว', icon: User, color: '#468f92' },
    { id: '2', title: 'ตั้งค่าการแจ้งเตือน', icon: Bell, color: '#e08955' },
    { id: '3', title: 'ความเป็นส่วนตัวและความปลอดภัย', icon: Shield, color: '#3caea3' },
    { id: '4', title: 'ช่วยเหลือและสนับสนุน', icon: CircleHelp, color: '#a388cd' },
  ];

  if (isLoading || !profile) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#468f92" translucent={true} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12 }]}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
            {isUpdatingAvatar && (
              <View style={styles.avatarLoaderOverlay}>
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            )}
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.cameraButton}>
              <Camera size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>
            {profile.name} <Text style={styles.profileUsername}>(@{profile.username})</Text>
          </Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>

          <TouchableOpacity onPress={() => handleCopyFriendCode(profile.friendCode)} activeOpacity={0.7} style={styles.friendCodeBadge}>
            <Text style={styles.friendCodeText}>รหัสเพื่อน: {profile.friendCode}</Text>
            <Copy size={13} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Menu List */}
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setActiveModal(item.id as any)}
                style={[
                  styles.menuItem,
                  { borderBottomWidth: index === MENU_ITEMS.length - 1 ? 0 : 1 }
                ]}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                    <IconComponent color={item.color} size={18} />
                  </View>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                </View>
                <ChevronRight color="#9ca3af" size={18} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout Button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut color="#f87171" size={18} />
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Dynamic Modal Bottom Sheet */}
      <Modal visible={activeModal !== null} animationType="slide" transparent={true} onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setActiveModal(null)} style={styles.modalOverlay}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalCloseContainer}>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeButton}>
                <X color="#9ca3af" size={20} />
              </TouchableOpacity>
            </View>

            {activeModal === '1' && (
              <View>
                <Text style={styles.modalHeading}>แก้ไขข้อมูลส่วนตัว</Text>
                <Text style={styles.fieldLabel}>ชื่อ - นามสกุล</Text>
                <View style={styles.textInputBox}>
                  <TextInput value={editName} onChangeText={setEditName} placeholder="ระบุชื่อของคุณ" style={styles.textInput} />
                </View>
                <Text style={styles.fieldLabel}>Username (ไม่สามารถเปลี่ยนได้)</Text>
                <View style={styles.disabledInputBox}>
                  <Text style={styles.disabledText}>@{profile.username}</Text>
                </View>
                <Text style={styles.fieldLabel}>อีเมล</Text>
                <View style={styles.textInputBox}>
                  <TextInput value={editEmail} onChangeText={setEditEmail} placeholder="ระบุอีเมล" keyboardType="email-address" autoCapitalize="none" style={styles.textInput} />
                </View>
                <TouchableOpacity onPress={handleSaveProfile} style={styles.primaryModalButton}>
                  <Text style={styles.primaryButtonText}>บันทึกข้อมูล</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeModal === '2' && (
              <View>
                <Text style={styles.modalHeading}>ตั้งค่าการแจ้งเตือน</Text>
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.switchTitle}>การนัดหมาย</Text>
                    <Text style={styles.switchSubtitle}>เตือนเมื่อถึงเวลานัดหมายหรือมีการอัปเดต</Text>
                  </View>
                  <Switch value={notiAppointments} onValueChange={setNotiAppointments} trackColor={{ false: '#d1d5db', true: '#468f92' }} />
                </View>
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.switchTitle}>กลุ่มและการเชิญ</Text>
                    <Text style={styles.switchSubtitle}>เตือนเมื่อมีการเชิญเข้ากลุ่มใหม่</Text>
                  </View>
                  <Switch value={notiGroups} onValueChange={setNotiGroups} trackColor={{ false: '#d1d5db', true: '#468f92' }} />
                </View>
                <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.primaryModalButton}>
                  <Text style={styles.primaryButtonText}>ตกลง</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeModal === '3' && (
              <View>
                <Text style={styles.modalHeading}>ความเป็นส่วนตัวและความปลอดภัย</Text>
                <View style={styles.switchRow}>
                  <View style={styles.flexOne}>
                    <Text style={styles.switchTitle}>โหมดส่วนตัว</Text>
                    <Text style={styles.switchSubtitle}>ซ่อนสถานะความว่างจากเพื่อนในกลุ่ม</Text>
                  </View>
                  <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: '#d1d5db', true: '#3caea3' }} />
                </View>
                <TouchableOpacity onPress={() => { setActiveModal(null); Alert.alert('ส่งอีเมลแล้ว', 'ส่งลิงก์เปลี่ยนรหัสผ่านไปยังอีเมลของคุณแล้ว'); }} style={styles.linkRow}>
                  <Lock size={18} color="#374151" style={styles.iconMargin} />
                  <Text style={styles.linkRowText}>เปลี่ยนรหัสผ่าน</Text>
                  <ChevronRight color="#9ca3af" size={18} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveModal(null)} style={[styles.primaryModalButton, styles.tealBg]}>
                  <Text style={styles.primaryButtonText}>ปิด</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeModal === '4' && (
              <View>
                <Text style={styles.modalHeading}>ช่วยเหลือและสนับสนุน</Text>
                <TouchableOpacity style={styles.linkRow}>
                  <HelpCircle size={18} color="#a388cd" style={styles.iconMargin} />
                  <Text style={styles.linkRowText}>คำถามที่พบบ่อย (FAQ)</Text>
                  <ChevronRight color="#9ca3af" size={18} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('ติดต่อเรา', 'ส่งข้อความหาเราได้ที่ support@friends-calendar.app')} style={styles.linkRow}>
                  <Mail size={18} color="#a388cd" style={styles.iconMargin} />
                  <Text style={styles.linkRowText}>ติดต่อฝ่ายสนับสนุน</Text>
                  <ChevronRight color="#9ca3af" size={18} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.primaryModalButton}>
                  <Text style={styles.primaryButtonText}>ตกลง</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#cce1de' },
  loaderContainer: { flex: 1, backgroundColor: '#cce1de', justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#468f92',
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center'
  },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarImage: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#ffffff' },
  avatarLoaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1C4E4E',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3
  },
  profileName: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 2, textAlign: 'center' },
  profileUsername: { fontWeight: 'normal', fontSize: 15, color: 'rgba(255,255,255,0.9)' },
  profileEmail: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 10 },
  friendCodeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(28, 78, 78, 0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  friendCodeText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  menuList: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#ffffff', borderRadius: 20, padding: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderColor: '#f3f4f6' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconContainer: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuItemTitle: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
  logoutButton: { marginHorizontal: 20, marginTop: 16, marginBottom: 28, backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 13, fontWeight: 'bold', color: '#f87171', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalCloseContainer: { alignItems: 'flex-end', marginBottom: 8 },
  closeButton: { padding: 4 },
  modalHeading: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 6 },
  textInputBox: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, height: 44, justifyContent: 'center', marginBottom: 12 },
  textInput: { fontSize: 14, color: '#374151' },
  disabledInputBox: { backgroundColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, height: 44, justifyContent: 'center', marginBottom: 12 },
  disabledText: { fontSize: 14, color: '#9ca3af' },
  primaryModalButton: { backgroundColor: '#468f92', borderRadius: 12, height: 46, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  tealBg: { backgroundColor: '#3caea3' },
  primaryButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  switchTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
  switchSubtitle: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  flexOne: { flex: 1, marginRight: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  iconMargin: { marginRight: 10 },
  linkRowText: { fontSize: 14, fontWeight: 'bold', color: '#374151', flex: 1 }
});