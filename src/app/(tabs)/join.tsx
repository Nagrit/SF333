import { useLocalSearchParams, useRouter } from 'expo-router';
import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../services/firebase';

export default function JoinGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const groupId = params.group as string;
  const currentUser = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [groupInfo, setGroupInfo] = useState<any>(null);

  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) {
        Alert.alert('ข้อผิดพลาด', 'ไม่พบลิงก์กลุ่มที่ไม่ถูกต้อง');
        router.replace('/(tabs)');
        return;
      }

      try {
        const docRef = doc(db, 'groups', groupId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGroupInfo(docSnap.data());
        } else {
          Alert.alert('ไม่พบกลุ่ม', 'กลุ่มนี้อาจถูกลบไปแล้ว');
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  const handleJoin = async () => {
    if (!currentUser) {
      Alert.alert('กรุณาเข้าสู่ระบบ', 'คุณต้องเข้าสู่ระบบก่อนเข้าร่วมกลุ่ม', [
        { text: 'ตกลง', onPress: () => router.replace('/(auth)/login') }
      ]);
      return;
    }

    try {
      setLoading(true);
      const groupRef = doc(db, 'groups', groupId);
      
      // เพิ่ม UID ของผู้ใช้เข้าไปในอาเรย์ members ของกลุ่ม
      await updateDoc(groupRef, {
        members: arrayUnion(currentUser.uid),
      });

      Alert.alert('สำเร็จ', 'คุณเข้าร่วมกลุ่มเรียบร้อยแล้ว!', [
        { text: 'ไปที่กลุ่ม', onPress: () => router.replace({ pathname: '/group-detail', params: { id: groupId } } as any) }
      ]);
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเข้าร่วมกลุ่มได้');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#dbe6e5' }}>
      <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 20, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1C4E4E', marginBottom: 8 }}>เข้าร่วมกลุ่ม</Text>
        <Text style={{ fontSize: 16, color: '#334155', marginBottom: 20, textAlign: 'center' }}>
          คุณได้รับเชิญให้เข้าร่วมกลุ่ม: <Text style={{ fontWeight: 'bold' }}>{groupInfo?.name}</Text>
        </Text>

        <TouchableOpacity
          onPress={handleJoin}
          style={{ backgroundColor: '#1C4E4E', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>ยืนยันเข้าร่วมกลุ่ม</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ padding: 8 }}>
          <Text style={{ color: '#64748b', fontWeight: '600' }}>ยกเลิก</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}