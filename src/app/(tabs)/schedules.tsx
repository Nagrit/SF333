import { useRouter } from 'expo-router';
import {
  Briefcase,
  Check,
  Coffee,
  Hourglass,
  MapPin,
  Plane,
  Search,
  User
} from 'lucide-react-native';
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
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/api';

export interface Appointment {
  id: string;
  time: string;
  title: string;
  group: string;
  location: string;
  badge: 'ยืนยันแล้ว' | 'รอยืนยัน';
  categoryKey: 'food' | 'trip' | 'work' | 'personal';
  category: string;
  avatars: string[];
  extraCount: number;
  statusText: string;
  dateHeader: string;
}

const CATEGORIES = [
  { key: 'all', label: 'ทุกประเภท', color: '#1c4e4e' },
  { key: 'food', label: 'นัดกินข้าว / กาแฟ', color: '#f2a541', Icon: Coffee },
  { key: 'trip', label: 'นัดเที่ยว / กรุ๊ป', color: '#e2572b', Icon: Plane },
  { key: 'work', label: 'ทำงาน / ติวหนังสือ', color: '#2c3a33', Icon: Briefcase },
  { key: 'personal', label: 'ตัวเอง', color: '#8b6fd9', Icon: User }
];

export default function SchedulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = useCallback(async (isPullToRefresh = false) => {
    try {
      if (!isPullToRefresh) setIsLoading(true);
      const data = await apiFetch<any[]>('/api/appointments');

      // ✅ Map ข้อมูลจาก Backend ให้ตรงตาม Interface พร้อมค่า Fallback
      const mappedAppointments: Appointment[] = (data || []).map((item: any) => {
        const isConfirmed = item.status === 'confirmed' || item.badge === 'ยืนยันแล้ว';
        
        let formattedTime = '00:00';
        if (item.startAt) {
          formattedTime = new Date(item.startAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        } else if (item.time) {
          formattedTime = item.time;
        }

        return {
          id: item.id || String(Math.random()),
          time: formattedTime,
          title: item.title || 'นัดหมายไม่มีชื่อ',
          group: item.group || item.groupName || 'กลุ่มทั่วไป',
          location: item.location || 'ไม่ระบุสถานที่',
          badge: isConfirmed ? 'ยืนยันแล้ว' : 'รอยืนยัน',
          categoryKey: item.categoryKey || item.category || 'food',
          category: item.categoryLabel || item.category || 'ทั่วไป',
          avatars: item.avatars || [],
          extraCount: item.extraCount || 0,
          statusText: item.statusText || (isConfirmed ? 'สมาชิกตอบรับแล้ว' : 'รอยืนยันวันเวลา'),
          dateHeader: item.dateHeader || item.startDate || ''
        };
      });

      setAppointments(mappedAppointments);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถโหลดข้อมูลนัดหมายได้');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments(true);
  };

  const filteredAppointments = appointments.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.title || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q) ||
      (item.group || '').toLowerCase().includes(q);

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'confirmed' && item.badge === 'ยืนยันแล้ว') ||
      (selectedStatus === 'pending' && item.badge === 'รอยืนยัน');

    const matchesCategory = selectedCategory === 'all' || item.categoryKey === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12 }]}>
        <Text style={styles.headerTitle}>นัดหมายทั้งหมด</Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.searchIconButton} activeOpacity={0.8}>
          <Search color="#ffffff" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#468f92']} />}
      >
        {showSearch && (
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <Search color="#9ca3af" size={18} style={styles.searchIcon} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="ค้นหานัดหมาย, สถานที่, หรือกลุ่ม..."
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
              />
            </View>

            {/* Filter Status */}
            <View style={styles.statusFilterRow}>
              <TouchableOpacity
                onPress={() => setSelectedStatus('all')}
                style={[styles.statusChip, selectedStatus === 'all' && styles.statusChipActiveAll]}
              >
                <Text style={[styles.statusChipText, selectedStatus === 'all' && styles.statusChipTextActive]}>ทั้งหมด</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus('confirmed')}
                style={[styles.statusChip, styles.statusChipConfirmed, selectedStatus === 'confirmed' && { backgroundColor: '#dcfce7' }]}
              >
                <Check size={12} color="#16a34a" />
                <Text style={styles.statusTextConfirmed}>ยืนยันแล้ว</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus('pending')}
                style={[styles.statusChip, styles.statusChipPending, selectedStatus === 'pending' && { backgroundColor: '#fef3c7' }]}
              >
                <Hourglass size={12} color="#d97706" />
                <Text style={styles.statusTextPending}>รอยืนยัน</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.key;
                const IconComponent = cat.Icon;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setSelectedCategory(cat.key)}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: isSelected ? cat.color : '#ffffff', borderColor: cat.color }
                    ]}
                  >
                    {IconComponent && <IconComponent size={14} color={isSelected ? '#ffffff' : cat.color} />}
                    <Text style={[styles.categoryChipText, { color: isSelected ? '#ffffff' : cat.color }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color="#468f92" style={styles.loader} />
        ) : filteredAppointments.length > 0 ? (
          filteredAppointments.map(item => {
            const avatars = item.avatars || [];
            const displayTime = (item.time || '00:00').replace(' น.', '');

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push({ pathname: '/appointment-detail', params: { id: item.id } })}
                activeOpacity={0.85}
                style={styles.appointmentCard}
              >
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{displayTime}</Text>
                  <Text style={styles.timeUnit}>น.</Text>
                </View>

                <View style={styles.detailBox}>
                  <View style={styles.tagsRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.badge === 'ยืนยันแล้ว' ? '#dcfce7' : '#fef3c7' }]}>
                      <Text style={[styles.statusBadgeText, { color: item.badge === 'ยืนยันแล้ว' ? '#16a34a' : '#d97706' }]}>
                        {item.badge}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardGroup}>กลุ่ม: {item.group}</Text>

                  <View style={styles.locationRow}>
                    <MapPin size={13} color="#374151" />
                    <Text style={styles.locationText}>{item.location}</Text>
                  </View>

                  <View style={styles.footerRow}>
                    <View style={styles.avatarRow}>
                      <View style={styles.avatarsContainer}>
                        {avatars.map((url, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: url }}
                            style={[styles.avatarImage, { marginLeft: idx === 0 ? 0 : -8 }]}
                          />
                        ))}
                      </View>
                      {item.extraCount > 0 && (
                        <View style={styles.extraCountBadge}>
                          <Text style={styles.extraCountText}>+{item.extraCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.statusDetailText}>{item.statusText}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่พบนัดหมายที่คุณค้นหา</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#cce1de' },
  header: {
    backgroundColor: '#468f92',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 20 },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: { padding: 16, paddingBottom: 32 },
  searchSection: { marginBottom: 16 },
  searchInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 12,
    elevation: 2
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1f2937' },
  statusFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statusChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1c4e4e',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statusChipActiveAll: { backgroundColor: '#1c4e4e' },
  statusChipText: { fontSize: 12, fontWeight: 'bold', color: '#1c4e4e' },
  statusChipTextActive: { color: '#ffffff' },
  statusChipConfirmed: { borderColor: '#16a34a', backgroundColor: '#ffffff' },
  statusTextConfirmed: { fontSize: 12, fontWeight: 'bold', color: '#16a34a' },
  statusChipPending: { borderColor: '#d97706', backgroundColor: '#ffffff' },
  statusTextPending: { fontSize: 12, fontWeight: 'bold', color: '#d97706' },
  categoryScroll: { gap: 8 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  categoryChipText: { fontSize: 12, fontWeight: 'bold' },
  loader: { marginTop: 40 },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center'
  },
  timeBox: {
    backgroundColor: '#fde68a',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    width: 74,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  timeText: { fontSize: 15, fontWeight: '900', color: '#78350f' },
  timeUnit: { fontSize: 11, fontWeight: 'bold', color: '#92400e', marginTop: 2 },
  detailBox: { flex: 1 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  categoryBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#d97706' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
  cardGroup: { fontSize: 11, color: '#4b5563', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  locationText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarsContainer: { flexDirection: 'row', marginRight: 6 },
  avatarImage: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#ffffff', backgroundColor: '#e5e7eb' },
  extraCountBadge: { backgroundColor: '#166534', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  extraCountText: { fontSize: 10, fontWeight: 'bold', color: '#ffffff' },
  statusDetailText: { fontSize: 11, color: '#16a34a', fontWeight: 'bold' },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#4b5563', fontWeight: '600' }
});