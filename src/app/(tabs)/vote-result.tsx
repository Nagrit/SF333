import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.68:4000';

export interface VoteResultItem {
  id?: string;
  rank: string;
  rankBg: string;
  rankColor: string;
  title: string;
  time: string;
  status: string;
  statusColor: string;
  progress: number;
  isWinner: boolean;
  avatars?: string[];
}

export default function VoteResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const appointmentId = (params.id as string) || '';

  const [title, setTitle] = useState<string>((params.title as string) || '');
  const [groupName, setGroupName] = useState<string>((params.group as string) || '');
  const [results, setResults] = useState<VoteResultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const fetchVoteResults = useCallback(async (isPullToRefresh = false) => {
    if (!appointmentId) {
      setIsLoading(false);
      return;
    }

    try {
      if (!isPullToRefresh) setIsLoading(true);
      const token = await SecureStore.getItemAsync('userToken');

      if (!token) {
        Alert.alert('เซสชันหมดอายุ', 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}/vote-result`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        if (data.title) setTitle(data.title);
        if (data.group) setGroupName(data.group);
      }
    } catch (error) {
      console.error('Error fetching vote results:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchVoteResults();
  }, [fetchVoteResults]);

  const handleConfirmWinner = async (winnerItem: VoteResultItem) => {
    try {
      setIsConfirming(true);
      const token = await SecureStore.getItemAsync('userToken');

      const response = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: winnerItem.title,
          startTime: winnerItem.time
        })
      });

      if (response.ok) {
        Alert.alert('สำเร็จ', 'สรุปวันนัดหมายและปิดการโหวตเรียบร้อยแล้ว', [
          {
            text: 'ตกลง',
            onPress: () => router.replace({ pathname: '/appointment-detail', params: { id: appointmentId } })
          }
        ]);
      } else {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถสรุปวันนัดหมายได้');
      }
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'การเชื่อมต่อขัดข้อง');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12 }
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#ffffff" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>สรุปผลโหวต 💻</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#468f92" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVoteResults(true); }} colors={['#468f92']} />
          }
        >
          {title ? <Text style={styles.appointmentTitle}>{title}</Text> : null}
          {groupName ? <Text style={styles.groupSubtext}>กลุ่ม: {groupName}</Text> : null}

          {results.map((item, index) => {
            const avatars = item.avatars || [];
            const progressPercent = Math.min(Math.max((item.progress || 0) * 100, 0), 100);

            return (
              <View key={item.id || index} style={styles.resultCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.rankBadge, { backgroundColor: item.rankBg || '#eef5f4' }]}>
                    <Text style={[styles.rankBadgeText, { color: item.rankColor || '#217371' }]}>
                      {item.rank}
                    </Text>
                  </View>
                  <Text style={[styles.statusText, { color: item.statusColor || '#22c55e' }]}>
                    {item.status}
                  </Text>
                </View>

                <Text style={styles.optionDateTitle}>{item.title}</Text>
                <Text style={styles.timeText}>⏰ {item.time}</Text>

                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: item.isWinner ? '#4ade80' : '#e08955'
                      }
                    ]}
                  />
                </View>

                <View style={[styles.avatarsRow, { marginBottom: item.isWinner ? 14 : 0 }]}>
                  {avatars.map((url, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: url }}
                      style={[styles.avatarImage, { marginLeft: idx === 0 ? 0 : -6 }]}
                    />
                  ))}
                </View>

                {item.isWinner && (
                  <TouchableOpacity
                    onPress={() => handleConfirmWinner(item)}
                    disabled={isConfirming}
                    style={styles.confirmWinnerButton}
                    activeOpacity={0.85}
                  >
                    {isConfirming ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.confirmWinnerButtonText}>สรุปวันนัดหมายด้วยเวลานี้ 🏆</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#cce1de' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#468f92', paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { paddingRight: 12 },
  headerTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  appointmentTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
  groupSubtext: { fontSize: 11, color: '#6b7280', marginBottom: 16 },
  resultCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 14, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rankBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rankBadgeText: { fontSize: 11, fontWeight: 'bold' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  optionDateTitle: { fontSize: 15, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
  timeText: { fontSize: 11, color: '#6b7280', marginBottom: 12 },
  progressBarTrack: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  avatarsRow: { flexDirection: 'row', alignItems: 'center' },
  avatarImage: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#ffffff', backgroundColor: '#e5e7eb' },
  confirmWinnerButton: { backgroundColor: '#217371', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  confirmWinnerButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 }
});