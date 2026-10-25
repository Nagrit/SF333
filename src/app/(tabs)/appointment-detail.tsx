import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, Calendar, Check, Clock, MapPin, Share2, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/api';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  status: 'confirmed' | 'accepted' | 'pending' | 'rejected' | 'voted' | 'waiting';
  statusText: string;
}

export interface AppointmentDetail {
  id: string;
  title: string;
  organizerName: string;
  organizerAvatar: string;
  isVotingMode: boolean;
  dateText?: string;
  timeText?: string;
  location: string;
  hasTimeConflict?: boolean;
  conflictDetailText?: string;
  userResponse: 'accept' | 'reject' | null;
  members: Member[];
  canDelete?: boolean;
  isOrganizer: boolean;
}

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  // ดึงรายละเอียดนัดหมายจาก Fastify Backend ผ่าน apiFetch
  const loadAppointmentDetail = useCallback(async (isPullToRefresh = false) => {
    if (!params.id) {
      setIsLoading(false);
      return;
    }

    try {
      if (!isPullToRefresh) setIsLoading(true);
      const res = await apiFetch<any>(`/api/appointments/${params.id}`);

      // รองรับโครงสร้างข้อมูลทั้งแบบ wrapped ({ appointment: ... }) หรือ direct object
      const raw = res?.appointment || res || {};

      const formattedMembers: Member[] = (raw.members || []).map(
        (m: any, idx: number) => {
          const rawStatus = String(m.status || 'pending').toLowerCase();

          let statusText = m.statusText || 'รอยืนยัน';

          if (['confirmed', 'accepted', 'accept'].includes(rawStatus)) {
            statusText = 'เข้าร่วม';
          } else if (['rejected', 'reject'].includes(rawStatus)) {
            statusText = 'ไม่สะดวก';
          } else if (rawStatus === 'voted') {
            statusText = 'โหวตแล้ว';
          }

          return {
            id: String(m.userId || m.id || idx),
            name: m.name || m.userName || 'สมาชิก',
            avatar:
              m.avatar ||
              m.avatarUrl ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
            status: rawStatus as Member['status'],
            statusText,
          };
        }
      );

      const formattedDetail: AppointmentDetail = {
        id: raw.id || params.id,
        title: raw.title || 'ไม่มีชื่อกิจกรรม',
        organizerName: raw.organizerName || raw.creatorName || 'ผู้จัดงาน',
        organizerAvatar: raw.organizerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        isVotingMode: raw.isVotingMode ?? raw.isVote ?? (raw.status === 'pending'),
        dateText: raw.dateText || (raw.startDate ? new Date(raw.startDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : undefined),
        timeText: raw.timeText || (raw.startAt ? new Date(raw.startAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : undefined),
        location: raw.location || 'ไม่ระบุสถานที่',
        hasTimeConflict: raw.hasTimeConflict ?? false,
        conflictDetailText: raw.conflictDetailText || '',
        userResponse:
          ['accept', 'accepted', 'confirmed'].includes(
            String(raw.userResponse || '').toLowerCase()
          )
            ? 'accept'
            : ['reject', 'rejected'].includes(
              String(raw.userResponse || '').toLowerCase()
            )
              ? 'reject'
              : null,
        members: formattedMembers,
        canDelete: raw.canDelete === true,
        isOrganizer: raw.isOrganizer ?? false,
      };

      setAppointment(formattedDetail);
    } catch (error: any) {
      console.error('Error loading appointment detail:', error);
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถโหลดรายละเอียดนัดหมายได้');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadAppointmentDetail();
  }, [loadAppointmentDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointmentDetail(true);
  };


  const handleDeleteAppointment = () => {
    if (!appointment || isDeleting) return;

    Alert.alert(
      'ลบนัดหมาย',
      `คุณต้องการลบ "${appointment.title}" ใช่หรือไม่?\nการลบนี้ไม่สามารถย้อนกลับได้`,
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ลบนัดหมาย',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);

              await apiFetch(`/api/appointments/${appointment.id}`, {
                method: 'DELETE',
              });

              Alert.alert('สำเร็จ', 'ลบนัดหมายเรียบร้อยแล้ว', [
                {
                  text: 'ตกลง',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              Alert.alert(
                'เกิดข้อผิดพลาด',
                error.message || 'ไม่สามารถลบนัดหมายได้',
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  // ตอบรับ / ปฏิเสธ นัดหมาย
  const handleUserResponse = async (response: 'accept' | 'reject') => {
    if (!appointment || isResponding) return;

    const previousResponse = appointment.userResponse;

    setAppointment(prev =>
      prev ? { ...prev, userResponse: response } : null
    );

    try {
      setIsResponding(true);

      await apiFetch(`/api/appointments/${appointment.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response }),
      });

      // โหลดสถานะล่าสุดจากฐานข้อมูล
      await loadAppointmentDetail(true);

      Alert.alert(
        'สำเร็จ',
        response === 'accept'
          ? 'ตอบรับคำเชิญเรียบร้อยแล้ว'
          : 'ปฏิเสธคำเชิญเรียบร้อยแล้ว'
      );
    } catch (error: any) {
      setAppointment(prev =>
        prev ? { ...prev, userResponse: previousResponse } : null
      );

      Alert.alert(
        'เกิดข้อผิดพลาด',
        error.message || 'ไม่สามารถบันทึกคำตอบได้ กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setIsResponding(false);
    }
  };


  const handleShare = async () => {
    if (!appointment) return;
    try {
      await Share.share({
        message: `นัดหมาย: ${appointment.title}\nสถานที่: ${appointment.location}${appointment.dateText ? `\nวันที่: ${appointment.dateText}` : ''}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>ไม่พบข้อมูลนัดหมาย</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonBtn}>
          <Text style={styles.backButtonText}>ย้อนกลับ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12 }
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackIcon}>
            <ArrowLeft color="#ffffff" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>รายละเอียดการนัดหมาย</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {appointment.isOrganizer && (
            <TouchableOpacity
              onPress={handleDeleteAppointment}
              disabled={isDeleting}
              style={styles.shareIcon}
            >
              {isDeleting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Trash2 color="#f75050" size={20} />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareIcon}
            accessibilityLabel="แชร์ Event"
          >
            <Share2 color="#ffffff" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#468f92']} />}
      >
        {/* Banner เตือนเวลาชนกัน */}
        {!appointment.isVotingMode && appointment.hasTimeConflict && (
          <View style={styles.conflictBanner}>
            <AlertCircle color="#ef4444" size={16} style={{ marginRight: 8 }} />
            <Text style={styles.conflictBannerText}>
              เวลาชนกับนัดอื่น: '{appointment.conflictDetailText}'
            </Text>
          </View>
        )}

        {/* Card รายละเอียดการนัดหมาย */}
        <View style={styles.detailCard}>
          <View style={styles.organizerRow}>
            <Image source={{ uri: appointment.organizerAvatar }} style={styles.organizerAvatar} />
            <Text style={styles.organizerLabel}>ผู้จัดงาน: </Text>
            <Text style={styles.organizerName}>{appointment.organizerName}</Text>
          </View>

          <Text style={styles.cardTitle}>{appointment.title}</Text>

          <View style={{ marginBottom: 12 }}>
            {!appointment.isVotingMode && (
              <>
                {appointment.dateText ? (
                  <View style={styles.infoRow}>
                    <Calendar color="#468f92" size={15} style={{ marginRight: 8 }} />
                    <Text style={styles.infoText}>{appointment.dateText}</Text>
                  </View>
                ) : null}

                {appointment.timeText ? (
                  <View style={styles.infoRow}>
                    <Clock color="#468f92" size={15} style={{ marginRight: 8 }} />
                    <Text style={styles.infoText}>{appointment.timeText}</Text>
                  </View>
                ) : null}
              </>
            )}

            <View style={styles.infoRow}>
              <MapPin color="#468f92" size={15} style={{ marginRight: 8 }} />
              <Text style={[styles.infoText, { flex: 1 }]}>{appointment.location}</Text>
            </View>
          </View>

          {/* แผนที่จำลอง */}
          <View style={styles.mapSimBox}>
            <View style={styles.mapPinContainer}>
              <MapPin color="#ffffff" size={18} />
            </View>
            <Text style={styles.mapLocationText}>{appointment.location}</Text>
          </View>
        </View>

        {/* ส่วนการตอบรับคำเชิญ / การโหวต */}
        {!appointment.isVotingMode ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionHeaderTitle}>ตอบรับคำเชิญของคุณ</Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => handleUserResponse('accept')}
                disabled={isResponding}
                style={[
                  styles.responseBtn,
                  { backgroundColor: appointment.userResponse === 'accept' ? '#16a34a' : '#4ade80' }
                ]}
                activeOpacity={0.8}
              >
                <Check color="#ffffff" size={16} style={{ marginRight: 6 }} />
                <Text style={styles.responseBtnText}>ตอบรับ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleUserResponse('reject')}
                disabled={isResponding}
                style={[
                  styles.responseBtn,
                  { backgroundColor: appointment.userResponse === 'reject' ? '#dc2626' : '#f87171' }
                ]}
                activeOpacity={0.8}
              >
                <X color="#ffffff" size={16} style={{ marginRight: 6 }} />
                <Text style={styles.responseBtnText}>ปฏิเสธ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionHeaderTitle}>โหวตวัน และเวลา</Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/vote-appointment', params: { id: appointment.id } })}
              style={styles.voteNowBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.voteNowBtnText}>โหวตเลย 🗳️</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* รายชื่อเพื่อนและสถานะ */}
        <View>
          <Text style={styles.sectionHeaderTitle}>
            รายชื่อเพื่อนและสถานะ ({(appointment?.members || []).length} คน)
          </Text>

          <View style={styles.membersCardBox}>
            {(appointment?.members || []).map((m: Member, idx: number) => {
              const isConfirmed = ['confirmed', 'accepted', 'voted'].includes(m.status);
              const isRejected = m.status === 'rejected';

              return (
                <View
                  key={m?.id || idx}
                  style={[
                    styles.memberItemRow,
                    { borderBottomWidth: idx === (appointment?.members || []).length - 1 ? 0 : 1 }
                  ]}
                >
                  <View style={styles.memberLeftInfo}>
                    <Image source={{ uri: m.avatar }} style={styles.memberAvatarImg} />
                    <Text style={styles.memberNameText}>{m?.name || 'สมาชิก'}</Text>
                  </View>

                  <View
                    style={[
                      styles.memberStatusChip,
                      {
                        backgroundColor: isConfirmed ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7'
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberStatusChipText,
                        {
                          color: isConfirmed ? '#16a34a' : isRejected ? '#dc2626' : '#d97706'
                        }
                      ]}
                    >
                      {m?.statusText || 'รอยืนยัน'}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* แสดงข้อความเมื่อไม่มีสมาชิก */}
            {(!appointment?.members || appointment.members.length === 0) && (
              <Text style={styles.emptyMembersText}>ยังไม่มีข้อมูลสมาชิก</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#cce1de' },
  centerContainer: { flex: 1, backgroundColor: '#cce1de', justifyContent: 'center', alignItems: 'center', padding: 20 },
  notFoundText: { fontSize: 14, color: '#4b5563', marginBottom: 12 },
  backButtonBtn: { backgroundColor: '#468f92', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  backButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  header: {
    backgroundColor: '#468f92',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerBackIcon: { paddingRight: 12 },
  headerTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
  shareIcon: { padding: 4 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  conflictBanner: {
    backgroundColor: '#fbe3e3',
    borderWidth: 1,
    borderColor: '#f87171',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  conflictBannerText: { fontSize: 11, color: '#ef4444', fontWeight: 'bold', flex: 1 },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    marginBottom: 16
  },
  organizerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  organizerAvatar: { width: 22, height: 22, borderRadius: 11, marginRight: 6 },
  organizerLabel: { fontSize: 11, color: '#9ca3af' },
  organizerName: { fontSize: 11, color: '#468f92', fontWeight: 'bold' },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 12, color: '#4b5563' },
  mapSimBox: {
    height: 110,
    backgroundColor: '#111827',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mapPinContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#468f92',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  mapLocationText: { fontSize: 10, color: '#ffffff', fontWeight: 'bold', marginTop: 4 },
  sectionHeaderTitle: { fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  responseBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  responseBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  voteNowBtn: { backgroundColor: '#217371', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  voteNowBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  membersCardBox: { backgroundColor: '#ffffff', borderRadius: 16, padding: 12 },
  memberItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderColor: '#f3f4f6'
  },
  memberLeftInfo: { flexDirection: 'row', alignItems: 'center' },
  memberAvatarImg: { width: 26, height: 26, borderRadius: 13, marginRight: 8, backgroundColor: '#e5e7eb' },
  memberNameText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  memberStatusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  memberStatusChipText: { fontSize: 11, fontWeight: 'bold' },
  emptyMembersText: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 }
});