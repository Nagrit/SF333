import * as Clipboard from 'expo-clipboard';
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase Imports
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

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
  const currentUser = auth.currentUser;

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  // Modal State
  const [activeModal, setActiveModal] = useState<'1' | '2' | '3' | '4' | null>(null);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Setting States
  const [notiAppointments, setNotiAppointments] = useState(true);
  const [notiGroups, setNotiGroups] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);

        let fetchedUsername = '';
        let fetchedFriendCode = 'FC-XXXXXX';
        let fetchedAvatar = '';
        let fetchedName = '';
        let fetchedEmail = '';

        if (currentUser) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            fetchedUsername = data.username || '';
            fetchedFriendCode = data.friendCode || 'FC-XXXXXX';
            fetchedAvatar = data.avatar || '';
            fetchedName = data.name || '';
            fetchedEmail = data.email || '';
          }
        }

        const savedUserInfo = await SecureStore.getItemAsync('userInfo');
        const parsedUser = savedUserInfo ? JSON.parse(savedUserInfo) : {};

        const loadedProfile = {
          id: currentUser?.uid || 'usr_01',
          name: fetchedName || parsedUser.name || currentUser?.displayName || 'ผู้ใช้งาน',
          username: fetchedUsername || parsedUser.username || 'user',
          email: fetchedEmail || parsedUser.email || currentUser?.email || 'user@example.com',
          friendCode: fetchedFriendCode,
          avatar: currentUser?.photoURL || fetchedAvatar || parsedUser.avatar || `https://picsum.photos/seed/${currentUser?.uid || 'user1'}/200`,
        };

        setProfile(loadedProfile);
        setEditName(loadedProfile.name);
        setEditEmail(loadedProfile.email);
      } catch (error) {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [currentUser]);

  // ฟังก์ชันคัดลอกรหัสเพื่อนเข้า Clipboard
  const handleCopyFriendCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('คัดลอกแล้ว', `คัดลอกรหัส ${code} ไปยังคลิปบอร์ดเรียบร้อยแล้ว`);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('การเข้าถึงถูกปฏิเสธ', 'กรุณานุญาตการเข้าถึงรูปภาพในตั้งค่าเครื่อง');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      const newAvatarUri = result.assets[0].uri;
      setIsUpdatingAvatar(true);

      try {
        if (profile) {
          const updated = { ...profile, avatar: newAvatarUri };
          setProfile(updated);

          // บันทึกลง SecureStore
          await SecureStore.setItemAsync('userInfo', JSON.stringify({
            name: updated.name,
            username: updated.username,
            email: updated.email,
            friendCode: updated.friendCode,
            avatar: newAvatarUri
          }));
        }

        if (currentUser) {
          // อัปเดตใน Firebase Auth
          await updateProfile(currentUser, { photoURL: newAvatarUri });

          // 🔥 บันทึกลงใน Firestore collection 'users' เพื่อให้เพื่อนและทุกคนในกลุ่มดึงไปแสดงผลได้
          await updateDoc(doc(db, 'users', currentUser.uid), {
            avatar: newAvatarUri
          });
        }

        Alert.alert('สำเร็จ', 'บันทึกรูปโปรไฟล์เรียบร้อยแล้ว');
      } catch (error) {
        console.log('Error updating avatar:', error);
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตรูปโปรไฟล์ได้');
      } finally {
        setIsUpdatingAvatar(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      const updatedProfile = {
        ...profile,
        name: editName,
        email: editEmail
      };
      setProfile(updatedProfile);

      await SecureStore.setItemAsync('userInfo', JSON.stringify({
        name: editName,
        username: profile.username,
        email: editEmail,
        friendCode: profile.friendCode,
        avatar: profile.avatar
      }));

      if (currentUser) {
        await updateProfile(currentUser, { displayName: editName });
        // บันทึกลง Firestore ด้วยเช่นกัน
        await updateDoc(doc(db, 'users', currentUser.uid), {
          name: editName,
          email: editEmail
        });
      }

      setActiveModal(null);
      Alert.alert('สำเร็จ', 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
    } catch (e) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync('userToken');
            await SecureStore.deleteItemAsync('userInfo');
            router.replace('/login');
          } catch (error) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้');
          }
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
      <View style={{ flex: 1, backgroundColor: '#cce1de', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  const renderModalContent = () => {
    switch (activeModal) {
      case '1':
        return (
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 16 }}>แก้ไขข้อมูลส่วนตัว</Text>

            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 6 }}>ชื่อ - นามสกุล</Text>
            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, height: 44, justifyContent: 'center', marginBottom: 12 }}>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="ระบุชื่อของคุณ"
                style={{ fontSize: 14, color: '#374151' }}
              />
            </View>

            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 6 }}>Username (ไม่สามารถเปลี่ยนได้)</Text>
            <View style={{ backgroundColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, height: 44, justifyContent: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, color: '#9ca3af' }}>@{profile.username}</Text>
            </View>

            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 6 }}>อีเมล</Text>
            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, height: 44, justifyContent: 'center', marginBottom: 24 }}>
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="ระบุอีเมล"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ fontSize: 14, color: '#374151' }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveProfile}
              style={{ backgroundColor: '#468f92', borderRadius: 12, height: 46, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>บันทึกข้อมูล</Text>
            </TouchableOpacity>
          </View>
        );

      case '2':
        return (
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 16 }}>ตั้งค่าการแจ้งเตือน</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#374151' }}>การนัดหมาย</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>เตือนเมื่อถึงเวลานัดหมายหรือมีการอัปเดต</Text>
              </View>
              <Switch value={notiAppointments} onValueChange={setNotiAppointments} trackColor={{ false: '#d1d5db', true: '#468f92' }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#374151' }}>กลุ่มและการเชิญ</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>เตือนเมื่อมีการเชิญเข้ากลุ่มใหม่</Text>
              </View>
              <Switch value={notiGroups} onValueChange={setNotiGroups} trackColor={{ false: '#d1d5db', true: '#468f92' }} />
            </View>

            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              style={{ backgroundColor: '#468f92', borderRadius: 12, height: 46, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        );

      case '3':
        return (
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 16 }}>ความเป็นส่วนตัวและความปลอดภัย</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#374151' }}>โหมดส่วนตัว</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>ซ่อนสถานะความว่างจากเพื่อนในกลุ่ม</Text>
              </View>
              <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: '#d1d5db', true: '#3caea3' }} />
            </View>

            <TouchableOpacity
              onPress={() => {
                setActiveModal(null);
                Alert.alert('ส่งอีเมลแล้ว', 'เราได้ส่งลิงก์เปลี่ยนรหัสผ่านไปยังอีเมลของคุณแล้ว');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' }}
            >
              <Lock size={18} color="#374151" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#374151', flex: 1 }}>เปลี่ยนรหัสผ่าน</Text>
              <ChevronRight color="#9ca3af" size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              style={{ backgroundColor: '#3caea3', borderRadius: 12, height: 46, justifyContent: 'center', alignItems: 'center', marginTop: 20 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>ปิด</Text>
            </TouchableOpacity>
          </View>
        );

      case '4':
        return (
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 16 }}>ช่วยเหลือและสนับสนุน</Text>

            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' }}>
              <HelpCircle size={18} color="#a388cd" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', flex: 1 }}>คำถามที่พบบ่อย (FAQ)</Text>
              <ChevronRight color="#9ca3af" size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('ติดต่อเรา', 'ส่งข้อความหาเราได้ที่ support@friends-calendar.app')}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' }}
            >
              <Mail size={18} color="#a388cd" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151', flex: 1 }}>ติดต่อฝ่ายสนับสนุน</Text>
              <ChevronRight color="#9ca3af" size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              style={{ backgroundColor: '#468f92', borderRadius: 12, height: 46, justifyContent: 'center', alignItems: 'center', marginTop: 20 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

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
            paddingBottom: 28,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            alignItems: 'center'
          }}
        >
          {/* Avatar Container + Camera Button */}
          <View style={{ position: 'relative', marginBottom: 12 }}>
            <Image
              source={{ uri: profile.avatar }}
              style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#ffffff' }}
            />
            {isUpdatingAvatar && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 44, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            )}
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.8}
              style={{
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
              }}
            >
              <Camera size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* ชื่อจริง และ Username ในวงเล็บ */}
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 2, textAlign: 'center' }}>
            {profile.name} <Text style={{ fontWeight: 'normal', fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>(@{profile.username})</Text>
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 10 }}>{profile.email}</Text>

          {/* Friend Code Badge สำหรับระบบเพิ่มเพื่อน (กด Copy ได้จริง) */}
          <TouchableOpacity
            onPress={() => handleCopyFriendCode(profile.friendCode)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(28, 78, 78, 0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 }}
          >
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }}>รหัสเพื่อน: {profile.friendCode}</Text>
            <Copy size={13} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Menu List */}
        <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: '#ffffff', borderRadius: 20, padding: 8 }}>
          {MENU_ITEMS.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setActiveModal(item.id as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
          onPress={handleLogout}
          style={{
            marginHorizontal: 20,
            marginTop: 16,
            marginBottom: 28,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <LogOut color="#f87171" size={18} />
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#f87171', marginLeft: 8 }}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Bottom Sheet */}
      <Modal
        visible={activeModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: Math.max(insets.bottom, 24)
            }}
          >
            {/* Header Close Button */}
            <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={{ padding: 4 }}>
                <X color="#9ca3af" size={20} />
              </TouchableOpacity>
            </View>

            {/* Dynamic Modal Body */}
            {renderModalContent()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}