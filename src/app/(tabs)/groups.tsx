import { useRouter } from 'expo-router';
import {
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
    UserPlus,
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
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase Imports
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

// ฟังก์ชันแปลงค่า string icon จากฐานข้อมูลให้เป็น Component พร้อมสี
const getGroupIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'laptop':
      return { icon: Laptop, color: '#3caea3' };
    case 'heart':
      return { icon: Heart, color: '#ed8b6e' };
    case 'star':
      return { icon: Star, color: '#e0a96d' };
    case 'coffee':
      return { icon: Coffee, color: '#a388cd' };
    case 'sparkles':
      return { icon: Sparkles, color: '#468f92' };
    case 'smile':
      return { icon: Smile, color: '#e08955' };
    case 'flame':
      return { icon: Flame, color: '#ef4444' };
    default:
      return { icon: Folder, color: '#468f92' };
  }
};

export default function GroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = auth.currentUser;

  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  // Modal เพิ่มเพื่อนด้วย Friend Code
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSearchingFriend, setIsSearchingFriend] = useState(false);

  // โหลดข้อมูลกลุ่มและเพื่อนจาก Firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setIsLoadingGroups(true);
        setIsLoadingFriends(true);

        // 1. ดึงข้อมูลกลุ่มทั้งหมดจาก Firestore
        const groupsSnapshot = await getDocs(collection(db, 'groups'));
        const loadedGroups: any[] = [];
        groupsSnapshot.forEach((docSnap) => {
          loadedGroups.push({ id: docSnap.id, ...docSnap.data() });
        });
        setGroups(loadedGroups);

        // 2. ดึงข้อมูลเพื่อนจาก sub-collection 'friends' พร้อมดึงรูปจริงจากคอลเลกชัน 'users'
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
        console.log('Error fetching data:', error);
      } finally {
        setIsLoadingGroups(false);
        setIsLoadingFriends(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // ฟังก์ชันค้นหาและเพิ่มเพื่อนด้วย Friend Code
  const handleAddFriendByCode = async () => {
    const code = friendCodeInput.trim().toUpperCase();
    if (!code) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรหัสเพื่อน (Friend Code)');
      return;
    }

    if (!currentUser) return;

    try {
      setIsSearchingFriend(true);
      const q = query(collection(db, 'users'), where('friendCode', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('ไม่พบผู้ใช้งาน', 'ไม่พบผู้ใช้ที่มีรหัสเพื่อนนี้ กรุณาตรวจสอบอีกครั้ง');
      } else {
        const friendDoc = querySnapshot.docs[0];
        const friendData = friendDoc.data();
        const friendUid = friendDoc.id;

        if (friendUid === currentUser.uid) {
          Alert.alert('แจ้งเตือน', 'คุณไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้');
          return;
        }

        const friendCheckRef = doc(db, 'users', currentUser.uid, 'friends', friendUid);
        const friendCheckSnap = await getDoc(friendCheckRef);

        if (friendCheckSnap.exists()) {
          Alert.alert('แจ้งเตือน', `${friendData.name} เป็นเพื่อนกับคุณอยู่แล้ว`);
          return;
        }

        await setDoc(doc(db, 'users', currentUser.uid, 'friends', friendUid), {
          addedAt: new Date().toISOString()
        });
        await setDoc(doc(db, 'users', friendUid, 'friends', currentUser.uid), {
          addedAt: new Date().toISOString()
        });

        setFriends(prev => [
          ...prev,
          {
            id: friendUid,
            name: friendData.name,
            username: friendData.username,
            avatar: friendData.avatar || `https://picsum.photos/seed/${friendUid}/100`
          }
        ]);

        Alert.alert('สำเร็จ!', `เพิ่มเพื่อน ${friendData.name} (@${friendData.username}) เรียบร้อยแล้ว`);
        setFriendCodeInput('');
        setIsAddFriendModalOpen(false);
      }
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มเพื่อนได้ในขณะนี้');
    } finally {
      setIsSearchingFriend(false);
    }
  };

  // ฟังก์ชันลบเพื่อน
  const handleRemoveFriend = (friendId: string, friendName: string) => {
    Alert.alert(
      'ลบเพื่อน',
      `คุณต้องการลบ "${friendName}" ออกจากรายชื่อเพื่อนใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;
            try {
              await deleteDoc(doc(db, 'users', currentUser.uid, 'friends', friendId));
              await deleteDoc(doc(db, 'users', friendId, 'friends', currentUser.uid));

              setFriends(prev => prev.filter(f => f.id !== friendId));
              Alert.alert('สำเร็จ', 'ลบเพื่อนเรียบร้อยแล้ว');
            } catch (error) {
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบเพื่อนได้ในขณะนี้');
            }
          }
        }
      ]
    );
  };

  // กรองกลุ่มตามคำค้นหา
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  // กรองเพื่อนตามคำค้นหา
  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase())
  );

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
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 22 }}>กลุ่มของฉัน</Text>
        <TouchableOpacity
          onPress={() => router.push('/create-group' as any)}
          style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus color="white" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Search Bar */}
        <View style={{ backgroundColor: '#ffffff', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 }}>
          <Search color="#70adb0" size={18} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ค้นหากลุ่มหรือเพื่อน..."
            style={{ flex: 1, marginLeft: 10, fontSize: 14, color: '#1f2937' }}
          />
        </View>

        {/* เพื่อนของฉัน */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#4a3b32', marginBottom: 12 }}>เพื่อนของฉัน</Text>

          <ScrollView horizontal showsHorizontalIndicator={false} contentContainerStyle={{ gap: 16, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setIsAddFriendModalOpen(true)}
              style={{ alignItems: 'center' }}
            >
              <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ed8b6e', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Plus color="#ed8b6e" size={22} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ed8b6e' }}>เพิ่มเพื่อน</Text>
            </TouchableOpacity>

            {isLoadingFriends ? (
              <ActivityIndicator size="small" color="#468f92" />
            ) : filteredFriends.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>ยังไม่มีเพื่อน กดปุ่ม "+" เพื่อเพิ่มเพื่อน</Text>
            ) : (
              filteredFriends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  onLongPress={() => handleRemoveFriend(friend.id, friend.name)}
                  style={{ alignItems: 'center', width: 60 }}
                >
                  <Image
                    source={{ uri: friend.avatar }}
                    style={{ width: 54, height: 54, borderRadius: 27, marginBottom: 6, borderWidth: 1, borderColor: '#ffffff' }}
                  />
                  <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: '#374151', textAlign: 'center' }}>
                    {friend.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* กลุ่มทั้งหมด */}
        <View>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#4a3b32', marginBottom: 12 }}>กลุ่มทั้งหมด</Text>

          {isLoadingGroups ? (
            <ActivityIndicator size="small" color="#468f92" style={{ marginTop: 20 }} />
          ) : filteredGroups.length === 0 ? (
            <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>ไม่พบกลุ่มที่คุณค้นหา</Text>
            </View>
          ) : (
            filteredGroups.map((group) => {
              const { icon: GroupIconComponent, color: iconColor } = getGroupIconComponent(group.icon);
              return (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => router.push({ pathname: '/group-detail', params: { id: group.id, name: group.name } })}
                  style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(60,174,163,0.3)', elevation: 1 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                      {/* แสดง Icon นำหน้าชื่อกลุ่ม */}
                      <GroupIconComponent size={18} color={iconColor} />
                      <Text numberOfLines={1} style={{ fontWeight: 'bold', fontSize: 16, color: '#1f2937', flex: 1 }}>
                        {group.name}
                      </Text>
                    </View>

                    {group.badgeText && (
                      <View style={{ backgroundColor: group.badgeType === 'orange' ? '#fdebe4' : '#f0e9f7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: group.badgeType === 'orange' ? '#ed7d58' : '#9c71ce' }}>
                          {group.badgeText}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>เคลื่อนไหวล่าสุด: {group.lastActive || 'เร็วๆ นี้'}</Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                        {group.avatars && group.avatars.map((url: string, idx: number) => (
                          <Image key={idx} source={{ uri: url }} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -10 }} />
                        ))}
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#468f92' }}>
                        สมาชิก {group.membersCount || 1} คน
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

      {/* Modal เพิ่มเพื่อนด้วยรหัสเพื่อน (Friend Code) */}
      <Modal visible={isAddFriendModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 320 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} color="#468f92" />
                <Text style={{ fontWeight: 'bold', color: '#1f2937', fontSize: 15 }}>เพิ่มเพื่อนด้วยรหัส</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddFriendModalOpen(false)}>
                <X color="#9ca3af" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
              กรอกรหัสเพื่อน (เช่น FC-XXXXXX) ที่ได้รับจากเพื่อนของคุณเพื่อเพิ่มเข้าสู่รายชื่อเพื่อน
            </Text>

            <TextInput
              value={friendCodeInput}
              onChangeText={setFriendCodeInput}
              placeholder="กรอกรหัสเพื่อน เช่น FC-A1B2C3"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              style={{ backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, height: 44, fontSize: 13, color: '#1f2937', marginBottom: 16 }}
            />

            <TouchableOpacity
              onPress={handleAddFriendByCode}
              disabled={isSearchingFriend}
              style={{ backgroundColor: '#468f92', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
            >
              {isSearchingFriend ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>ยืนยันเพิ่มเพื่อน</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}