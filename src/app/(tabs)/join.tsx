import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { apiFetch } from '../../services/api';

export interface GroupSummary {
  id: string;
  name: string;
}

export default function JoinGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const groupId = params.group as string;

  const [loading, setLoading] = useState(true);
  const [groupInfo, setGroupInfo] = useState<GroupSummary | null>(null);

  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) {
        Alert.alert('ข้อผิดพลาด', 'ไม่พบลิงก์กลุ่มที่ไม่ถูกต้อง');
        router.replace('/(tabs)');
        return;
      }

      try {
        const data = await apiFetch<GroupSummary>(`/api/groups/${groupId}`);
        setGroupInfo(data);
      } catch (error: any) {
        Alert.alert('ไม่พบกลุ่ม', error.message || 'กลุ่มนี้อาจถูกลบไปแล้ว');
        router.replace('/(tabs)');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  const handleJoin = async () => {
    try {
      setLoading(true);
      await apiFetch(`/api/groups/${groupId}/join`, { method: 'POST' });

      Alert.alert('สำเร็จ', 'คุณเข้าร่วมกลุ่มเรียบร้อยแล้ว!', [
        { text: 'ไปที่กลุ่ม', onPress: () => router.replace({ pathname: '/group-detail', params: { id: groupId } }) }
      ]);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเข้าร่วมกลุ่มได้');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>เข้าร่วมกลุ่ม</Text>
        <Text style={styles.message}>
          คุณได้รับเชิญให้เข้าร่วมกลุ่ม: <Text style={styles.groupName}>{groupInfo?.name}</Text>
        </Text>

        <TouchableOpacity onPress={handleJoin} style={styles.confirmButton}>
          <Text style={styles.confirmButtonText}>ยืนยันเข้าร่วมกลุ่ม</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>ยกเลิก</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#dbe6e5' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 20, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 4 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1C4E4E', marginBottom: 8 },
  message: { fontSize: 16, color: '#334155', marginBottom: 20, textAlign: 'center' },
  groupName: { fontWeight: 'bold' },
  confirmButton: { backgroundColor: '#1C4E4E', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  confirmButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelButton: { padding: 8 },
  cancelButtonText: { color: '#64748b', fontWeight: '600' }
});