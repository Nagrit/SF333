import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Coffee, Flame, Heart, Laptop, Smile, Sparkles, Star, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase Imports
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

// รายการไอคอนให้เลือกสำหรับกลุ่ม
const GROUP_ICONS = [
  { id: 'laptop', name: 'งาน/เรียน', icon: Laptop, color: '#3caea3' },
  { id: 'heart', name: 'ครอบครัว/แฟน', icon: Heart, color: '#ed8b6e' },
  { id: 'star', name: 'คนสำคัญ', icon: Star, color: '#e0a96d' },
  { id: 'coffee', name: 'คาเฟ่/พักผ่อน', icon: Coffee, color: '#a388cd' },
  { id: 'sparkles', name: 'ปาร์ตี้', icon: Sparkles, color: '#468f92' },
  { id: 'smile', name: 'แก๊งเพื่อน', icon: Smile, color: '#e08955' },
  { id: 'flame', name: 'ลุยๆ', icon: Flame, color: '#ef4444' },
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = auth.currentUser;

  const [groupName, setGroupName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('laptop'); // ค่าเริ่มต้นไอคอน
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // โหลดรายชื่อเพื่อนเฉพาะที่เป็นเพื่อนกันจริง ๆ (จาก sub-collection 'friends')
  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;

      try {
        setIsLoadingFriends(true);
        const friendsRef = collection(db, 'users', currentUser.uid, 'friends');
        const friendsSnapshot = await getDocs(friendsRef);
        const loadedFriends: any[] = [];

        for (const friendDoc of friendsSnapshot.docs) {
          const friendUid = friendDoc.id;
          const userDocRef = doc(db, 'users', friendUid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            loadedFriends.push({
              id: friendUid,
              name: userData.name || 'ผู้ใช้งาน',
              username: userData.username || '',
              avatar: userData.avatar || `https://picsum.photos/seed/${friendUid}/100`,
            });
          }
        }
        setFriends(loadedFriends);
      } catch (error) {
        console.log('Error fetching friends:', error);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [currentUser]);

  // สลับการเลือกเพื่อนที่จะเข้ากลุ่ม
  const toggleSelectFriend = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  // ฟังก์ชันสร้างกลุ่ม
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อกลุ่มของคุณ');
      return;
    }

    if (!currentUser) return;

    try {
      setIsSubmitting(true);
      const groupId = 'group_' + Date.now();
      
      // รวบรวมรายชื่อสมาชิกรวมตัวเจ้าของกลุ่มด้วย
      const members = [currentUser.uid, ...selectedFriends];
      
      // ดึง Avatar ของสมาชิกมาแสดงตัวอย่างในกลุ่ม (สูงสุด 3 คนแรก)
      const avatars: string[] = [];
      if (currentUser.photoURL) avatars.push(currentUser.photoURL);
      for (const friendId of selectedFriends.slice(0, 2)) {
        const friend = friends.find(f => f.id === friendId);
        if (friend) avatars.push(friend.avatar);
      }

      // บันทึกข้อมูลกลุ่มลงใน Firestore
      await setDoc(doc(db, 'groups', groupId), {
        id: groupId,
        name: groupName.trim(),
        icon: selectedIcon, // บันทึกไอคอนที่เลือก
        createdBy: currentUser.uid,
        members: members,
        membersCount: members.length,
        avatars: avatars.length > 0 ? avatars : ['https://picsum.photos/seed/default/100'],
        lastActive: 'เพิ่งสร้างเมื่อสักครู่',
        badgeText: 'กลุ่มใหม่ ✨',
        badgeType: 'orange',
        createdAt: new Date().toISOString()
      });

      Alert.alert('สำเร็จ', 'สร้างกลุ่มเรียบร้อยแล้ว!', [
        { text: 'ตกลง', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.log('Error creating group:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างกลุ่มได้ในขณะนี้');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft color="#ffffff" size={22} />
          </TouchableOpacity>
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>สร้างกลุ่มใหม่</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        
        {/* ชื่อกลุ่ม */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#4a3b32', marginBottom: 8 }}>ชื่อกลุ่ม</Text>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="เช่น แก๊งค์มหาลัย, ทีมโปรเจกต์ 💻"
            placeholderTextColor="#9ca3af"
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: 12, 
              paddingHorizontal: 16, 
              height: 48, 
              fontSize: 14, 
              color: '#1f2937',
              borderWidth: 1,
              borderColor: 'rgba(60,174,163,0.3)'
            }}
          />
        </View>

        {/* เลือกไอคอนประจำกลุ่ม */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#4a3b32', marginBottom: 8 }}>เลือกไอคอนกลุ่ม</Text>
          <ScrollView horizontal showsHorizontalIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {GROUP_ICONS.map((item) => {
              const IconComp = item.icon;
              const isSelected = selectedIcon === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedIcon(item.id)}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    backgroundColor: isSelected ? item.color : '#ffffff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: isSelected ? '#1f2937' : 'rgba(60,174,163,0.3)',
                    elevation: isSelected ? 3 : 1
                  }}
                >
                  <IconComp size={22} color={isSelected ? '#ffffff' : item.color} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* เลือกสมาชิกเข้ากลุ่ม */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#4a3b32', marginBottom: 4 }}>
            เพิ่มเพื่อนเข้ากลุ่ม ({selectedFriends.length} คนที่เลือก)
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
            เลือกเพื่อนของคุณจากรายชื่อด้านล่างเพื่อเข้าร่วมกลุ่ม
          </Text>

          {isLoadingFriends ? (
            <ActivityIndicator size="small" color="#468f92" style={{ marginTop: 20 }} />
          ) : friends.length === 0 ? (
            <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center' }}>
              <Users size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
              <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: 'bold' }}>ยังไม่มีเพื่อนในระบบ</Text>
              <Text style={{ color: '#9ca3af', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                คุณต้องเพิ่มเพื่อนด้วยรหัสเพื่อน (Friend Code) ก่อนจึงจะสามารถเชิญเข้ากลุ่มได้
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {friends.map((friend) => {
                const isSelected = selectedFriends.includes(friend.id);
                return (
                  <TouchableOpacity
                    key={friend.id}
                    onPress={() => toggleSelectFriend(friend.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#ffffff',
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSelected ? '#468f92' : 'rgba(60,174,163,0.2)'
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Image source={{ uri: friend.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                      <View>
                        <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#1f2937' }}>{friend.name}</Text>
                        <Text style={{ fontSize: 11, color: '#6b7280' }}>@{friend.username}</Text>
                      </View>
                    </View>

                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? '#468f92' : '#d1d5db',
                      backgroundColor: isSelected ? '#468f92' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ปุ่มยืนยันการสร้างกลุ่ม */}
        <TouchableOpacity
          onPress={handleCreateGroup}
          disabled={isSubmitting}
          style={{
            backgroundColor: '#468f92',
            borderRadius: 14,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#468f92',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}>สร้างกลุ่ม</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}