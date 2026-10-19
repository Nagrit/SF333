import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
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
import { apiFetch } from '../../services/api';

export interface VoteOption {
  id: string;
  title?: string;
  date: string;
  time: string;
  votes: string;
  progress: number;
  avatars?: string[];
}

export interface VoteAppointmentData {
  title: string;
  groupName: string;
  status?: string;
  isVote?: boolean;
  options: VoteOption[];
  userSelectedIds?: string[];
  isOrganizer?: boolean;
}

export default function VoteAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const appointmentId = (params.id as string) || '';
  const insets = useSafeAreaInsets();

  const [voteData, setVoteData] = useState<VoteAppointmentData | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVoteDetails = useCallback(async (isPullToRefresh = false) => {
    if (!appointmentId) return;

    try {
      if (!isPullToRefresh) setIsLoading(true);
      const res = await apiFetch<any>(`/api/appointments/${appointmentId}/vote`);

      if (res.status === 'confirmed' || res.isVote === false) {
        Alert.alert('การโหวตสิ้นสุดแล้ว', 'ผู้จัดได้ทำการสรุปวันนัดหมายเรียบร้อยแล้ว', [
          {
            text: 'ดูรายละเอียดนัดหมาย',
            onPress: () => router.replace({ pathname: '/appointment-detail', params: { id: appointmentId } })
          }
        ]);
        return;
      }

      const mappedData: VoteAppointmentData = {
        title: res.title || 'นัดหมาย',
        groupName: res.groupName || res.group || 'กลุ่มทั่วไป',
        userSelectedIds: res.userSelectedIds || [],
        isOrganizer: res.isOrganizer ?? false,
        options: (res.options || []).map((opt: any) => ({
          id: opt.id || '1',
          title: opt.title || 'วันและเวลาที่เสนอ',
          date: opt.date || opt.dateText || 'ไม่ระบุวัน',
          time: opt.time || opt.timeText || 'ไม่ระบุเวลา',
          votes: opt.votes || `${opt.votesCount || 0} คน`,
          progress: typeof opt.progress === 'number' ? opt.progress : 0,
          avatars: opt.avatars || [],
        }))
      };

      setVoteData(mappedData);
      setSelectedOptions(mappedData.userSelectedIds || []);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถดึงข้อมูลการโหวตได้');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchVoteDetails();
  }, [fetchVoteDetails]);

  const toggleOption = (id: string) => {
    setSelectedOptions(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubmitVote = async () => {
    if (selectedOptions.length === 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกอย่างน้อย 1 ตัวเลือกเพื่อโหวต');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch(`/api/appointments/${appointmentId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionIds: selectedOptions })
      });

      Alert.alert('สำเร็จ', 'บันทึกการโหวตวันนัดหมายของคุณแล้ว', [
        {
          text: 'ดูผลโหวต',
          onPress: () => router.push({ pathname: '/vote-result', params: { id: appointmentId } })
        }
      ]);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถส่งผลโหวตได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !voteData) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#ffffff" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>โหวตการนัด 💻</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVoteDetails(true); }} colors={['#468f92']} />
        }
      >
        <Text style={styles.titleText}>{voteData.title}</Text>
        <Text style={styles.subtitleText}>กลุ่ม: {voteData.groupName} · เลือกวันและเวลาที่คุณสะดวก</Text>

        {voteData.options.map(item => {
          const isSelected = selectedOptions.includes(item.id);
          const avatars = item.avatars || [];
          const progressPercent = Math.min(Math.max((item.progress || 0) * 100, 0), 100);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => toggleOption(item.id)}
              activeOpacity={0.9}
              style={styles.optionCard}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionHeaderLeft}>
                  {isSelected ? (
                    <View style={styles.checkboxSelected}>
                      <Check color="white" size={14} strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={styles.checkboxUnselected} />
                  )}
                  <Text style={[styles.optionTitle, { color: isSelected ? '#217371' : '#1f2937' }]}>
                    {item.title}
                  </Text>
                </View>
                <View style={styles.votesBadge}>
                  <Text style={styles.votesBadgeText}>{item.votes}</Text>
                </View>
              </View>

              <Text style={styles.optionDate}>{item.date}</Text>
              <Text style={styles.optionTime}>{item.time}</Text>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>

              <View style={styles.avatarsRow}>
                <Text style={styles.avatarsLabel}>เพื่อนที่โหวตตัวเลือกนี้:</Text>
                <View style={styles.avatarsList}>
                  {avatars.map((url, idx) => (
                    <Image key={idx} source={{ uri: url }} style={[styles.avatarImg, { marginLeft: idx === 0 ? 0 : -6 }]} />
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity onPress={handleSubmitVote} disabled={isSubmitting} style={styles.submitButton}>
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>ยืนยันการโหวต 🏆</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#cce1de' },
  loaderContainer: { flex: 1, backgroundColor: '#cce1de', justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#468f92', paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { paddingRight: 12 },
  headerTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  titleText: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
  subtitleText: { fontSize: 11, color: '#6b7280', marginBottom: 16 },
  optionCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 14, elevation: 2 },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  optionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkboxSelected: { width: 20, height: 20, borderRadius: 5, backgroundColor: '#3caea3', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkboxUnselected: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#9ca3af', marginRight: 8 },
  optionTitle: { fontSize: 12, fontWeight: 'bold', flex: 1 },
  votesBadge: { backgroundColor: '#eef5f4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  votesBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#217371' },
  optionDate: { fontSize: 14, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
  optionTime: { fontSize: 11, color: '#6b7280', marginBottom: 12 },
  progressBarBg: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', backgroundColor: '#3caea3', borderRadius: 3 },
  avatarsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarsLabel: { fontSize: 10, color: '#9ca3af' },
  avatarsList: { flexDirection: 'row' },
  avatarImg: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#ffffff', backgroundColor: '#e5e7eb' },
  submitButton: { backgroundColor: '#217371', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 }
});