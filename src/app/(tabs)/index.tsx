import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/api';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export type AppointmentStatus = 'green' | 'red' | 'orange';
export type CalendarViewType = 'week' | 'month' | 'year';

export interface AppointmentItem {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  statusText: string;
  avatars: string[];
  startAt?: string | null;
  endAt?: string | null;
}

export interface PendingAppointmentItem {
  id: string;
  category: string;
  title: string;
  groupName: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

const BUSY_THRESHOLD_HOURS = 24 * 0.7; // 16.8 ชั่วโมง
const HOUR_MS = 60 * 60 * 1000;

const formatDateKey = (year: number, month: number, day: number): string => {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

export default function IndexScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);


  const today = new Date();
  const initialTodayStr = formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
    name: 'ผู้ใช้งาน',
    avatar: 'https://picsum.photos/seed/user/100'
  });

  const [calendarView, setCalendarView] = useState<CalendarViewType>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(initialTodayStr);

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointmentItem[]>([]);
  const [dateStatuses, setDateStatuses] = useState<Record<string, AppointmentStatus>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiFetch<{ unreadCount?: number }>(
        '/api/notifications'
      );

      setUnreadCount(
        typeof res?.unreadCount === 'number' ? res.unreadCount : 0
      );
    } catch (error) {
      console.error('[Notifications] Failed to fetch unread count:', error);
    }
  }, []);

  // ดึงข้อมูลทั้งหมดจาก API
  const fetchAllData = useCallback(async () => {
    try {
      console.log('📡 [fetchAllData] Start fetching from Render...');

      const [userRes, appRes, pendingRes, statusRes] = await Promise.all([
        apiFetch<UserProfile>('/api/auth/me'),
        apiFetch<AppointmentItem[]>('/api/appointments'),
        apiFetch<PendingAppointmentItem[]>('/api/appointments/pending'),
        apiFetch<Record<string, AppointmentStatus>>('/api/user-status'),
      ]);


      console.log('✅ [fetchAllData] User data received:', userRes?.name || 'No user name');

      if (userRes) setUserProfile(userRes);
      if (appRes) setAppointments(appRes);
      if (pendingRes) setPendingAppointments(pendingRes);
      if (statusRes) setDateStatuses(statusRes);
    } catch (error: any) {
      console.error('❌ [fetchAllData] Error details:', error?.message || error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);

    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  const getDayStatus = (fullDate: string | null): AppointmentStatus => {
    if (!fullDate) return 'green';

    if (dateStatuses[fullDate]) {
      return dateStatuses[fullDate];
    }

    const [year, month, day] = fullDate.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day).getTime();
    const dayEnd = new Date(year, month - 1, day + 1).getTime();

    const totalMs = appointments.reduce((total, item) => {
      if (!item.startAt || !item.endAt) return total;

      const start = new Date(item.startAt).getTime();
      const end = new Date(item.endAt).getTime();

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return total;
      }

      const overlapStart = Math.max(start, dayStart);
      const overlapEnd = Math.min(end, dayEnd);

      return total + Math.max(0, overlapEnd - overlapStart);
    }, 0);

    const totalHours = totalMs / HOUR_MS;

    if (totalHours === 0) return 'green';
    if (totalHours > BUSY_THRESHOLD_HOURS) return 'red';

    return 'orange';
  };

  const getAppointmentCountForMonth = (year: number, monthIndex: number) => {
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const targetMonthPrefix = `${year}-${monthStr}-`;
    return appointments.filter(item => item.date.startsWith(targetMonthPrefix)).length;
  };

  const filteredAppointments = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day).getTime();
    const dayEnd = new Date(year, month - 1, day + 1).getTime();

    return appointments.filter((item) => {
      if (!item.startAt || !item.endAt) {
        return item.date === selectedDate;
      }

      const start = new Date(item.startAt).getTime();
      const end = new Date(item.endAt).getTime();

      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return item.date === selectedDate;
      }

      return start < dayEnd && end > dayStart;
    });
  }, [appointments, selectedDate]);

  const handleSelectDate = (fullDate: string) => {
    setSelectedDate(fullDate);
    scrollViewRef.current?.scrollTo({ y: 380, animated: true });
  };

  const handleSaveStatus = async () => {
    const previousStatuses = { ...dateStatuses };
    const newStatuses = { ...dateStatuses };

    if (selectedStatus) {
      newStatuses[selectedDate] = selectedStatus;
    } else {
      delete newStatuses[selectedDate];
    }

    setDateStatuses(newStatuses);
    setIsStatusModalOpen(false);

    try {
      setIsSavingStatus(true);
      await apiFetch('/api/user-status', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          status: selectedStatus
        })
      });
    } catch (error: any) {
      setDateStatuses(previousStatuses);
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถบันทึกสถานะได้');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleOpenStatusModal = (fullDate: string) => {
    setSelectedDate(fullDate);
    setSelectedStatus(getDayStatus(fullDate));
    setIsStatusModalOpen(true);
  };

  const handlePrev = () => {
    if (calendarView === 'week') {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const prevW = new Date(y, m - 1, d - 7);
      const formatted = formatDateKey(prevW.getFullYear(), prevW.getMonth() + 1, prevW.getDate());
      setSelectedDate(formatted);
      setCurrentMonth(new Date(prevW.getFullYear(), prevW.getMonth(), 1));
    } else if (calendarView === 'year') {
      setCurrentMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
    } else {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (calendarView === 'week') {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const nextW = new Date(y, m - 1, d + 7);
      const formatted = formatDateKey(nextW.getFullYear(), nextW.getMonth() + 1, nextW.getDate());
      setSelectedDate(formatted);
      setCurrentMonth(new Date(nextW.getFullYear(), nextW.getMonth(), 1));
    } else if (calendarView === 'year') {
      setCurrentMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
    } else {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: '', status: null, fullDate: null });
    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = formatDateKey(year, month + 1, i);
      days.push({ date: i.toString(), status: getDayStatus(fullDate), fullDate });
    }
    return days;
  }, [currentMonth, dateStatuses, appointments]);

  const weeklyDays = useMemo(() => {
    if (!selectedDate) return [];
    const [y, m, d] = selectedDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    const firstDayOfWeek = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - curr.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate() + i);
      const fullDate = formatDateKey(day.getFullYear(), day.getMonth() + 1, day.getDate());
      days.push({ date: day.getDate().toString(), status: getDayStatus(fullDate), fullDate, dayObj: day });
    }
    return days;
  }, [selectedDate, dateStatuses, appointments]);

  const renderWeekHeader = () => {
    if (weeklyDays.length < 7) return null;
    const first = weeklyDays[0].dayObj;
    const last = weeklyDays[6].dayObj;
    const weekOfMonth = Math.ceil(last.getDate() / 7);

    let rangeText = '';
    if (first.getMonth() === last.getMonth()) {
      rangeText = `${first.getDate()} - ${last.getDate()} ${THAI_MONTHS[first.getMonth()]} ${first.getFullYear()}`;
    } else {
      rangeText = `${first.getDate()} ${THAI_MONTHS[first.getMonth()]} - ${last.getDate()} ${THAI_MONTHS[last.getMonth()]} ${first.getFullYear()}`;
    }

    return (
      <View style={styles.weekHeaderBox}>
        <Text style={styles.weekHeaderSubtext}>สัปดาห์ที่ {weekOfMonth} ของเดือน</Text>
        <Text style={styles.weekHeaderTitle}>{rangeText}</Text>
      </View>
    );
  };

  const getDotColor = (status: AppointmentStatus | null) => {
    if (status === 'red') return '#f87171';
    if (status === 'orange') return '#e08955';
    return '#4ade80';
  };

  const formatSelectedDateText = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${d} ${THAI_MONTHS[m - 1]} ${y}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#468f92" />}
      >
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12 }]}>
          <View style={styles.headerRow}>
            <View style={styles.userRow}>
              <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
              <View>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userNameText}>{userProfile.name}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={styles.bellButton}
              activeOpacity={0.8}
            >
              <Bell color="#e08955" size={20} />

              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          {[
            { key: 'week', label: 'รายสัปดาห์' },
            { key: 'month', label: 'รายเดือน' },
            { key: 'year', label: 'รายปี' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setCalendarView(tab.key as CalendarViewType)}
              style={[
                styles.tabButton,
                calendarView === tab.key && styles.tabButtonActive
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, calendarView === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          <View style={[styles.calendarHeader, calendarView === 'week' && styles.calendarHeaderLeft]}>
            <TouchableOpacity onPress={handlePrev} style={styles.navButton}>
              <ChevronLeft color="#4a3b32" size={20} />
            </TouchableOpacity>

            {calendarView === 'week' ? (
              renderWeekHeader()
            ) : (
              <TouchableOpacity
                onPress={() => setCalendarView('year')}
                style={styles.monthSelector}
                activeOpacity={0.7}
              >
                <Text style={styles.monthTitle}>
                  {calendarView === 'year'
                    ? currentMonth.getFullYear()
                    : `${THAI_MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleNext} style={styles.navButton}>
              <ChevronRight color="#4a3b32" size={20} />
            </TouchableOpacity>
          </View>

          {/* มุมมองรายปี */}
          {calendarView === 'year' && (
            <View style={styles.yearGrid}>
              {THAI_MONTHS.map((month, idx) => {
                const count = getAppointmentCountForMonth(currentMonth.getFullYear(), idx);
                return (
                  <TouchableOpacity
                    key={month}
                    onPress={() => {
                      setCurrentMonth(new Date(currentMonth.getFullYear(), idx, 1));
                      setCalendarView('month');
                    }}
                    style={[
                      styles.yearMonthCard,
                      count > 0 && styles.yearMonthCardActive
                    ]}
                  >
                    <Text style={styles.yearMonthText}>{month}</Text>
                    <Text style={[styles.yearMonthSubtext, count > 0 && styles.yearMonthSubtextActive]}>
                      {count > 0 ? `${count} นัดหมาย` : 'ว่าง'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* มุมมองรายเดือน / รายสัปดาห์ */}
          {calendarView !== 'year' && (
            <>
              <View style={styles.weekDaysHeader}>
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, i) => (
                  <View key={i} style={styles.weekDayCol}>
                    <Text style={[styles.weekDayText, i === 0 && styles.sundayText]}>{day}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.daysGrid}>
                {(calendarView === 'month' ? calendarDays : weeklyDays).map((d, i) => {
                  const todayObj = new Date();
                  const todayString = formatDateKey(todayObj.getFullYear(), todayObj.getMonth() + 1, todayObj.getDate());
                  const isToday = d.fullDate === todayString;
                  const isSelected = d.fullDate === selectedDate;

                  return (
                    <View key={i} style={styles.dayCell}>
                      {d.fullDate && (
                        <TouchableOpacity
                          onPress={() => handleSelectDate(d.fullDate!)}
                          onLongPress={() => handleOpenStatusModal(d.fullDate!)}
                          style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dayText, isToday && styles.todayText]}>
                            {d.date}
                          </Text>
                          <View style={[styles.statusDot, { backgroundColor: getDotColor(d.status) }]} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={styles.divider} />

              {/* Legend คำอธิบายจุดสี */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.dotGreen]} />
                  <Text style={styles.legendText}>ว่าง</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.dotOrange]} />
                  <Text style={styles.legendText}>อาจจะ</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.dotRed]} />
                  <Text style={styles.legendText}>ไม่ว่าง</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* นัดหมายที่รอยืนยัน / โหวตเวลา */}
        {calendarView !== 'year' && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingHeader}>
              <Text style={styles.pendingTitle}>นัดหมายที่รอยืนยัน / โหวตเวลา</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>ยังไม่ได้ลงปฏิทิน {pendingAppointments.length}</Text>
              </View>
            </View>
            <Text style={styles.pendingSubtitle}>
              นัดหมายเหล่านี้ยังรอโหวตเคาะวัน เมื่อยืนยันแล้วจะปรากฏในปฏิทินทันที
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pendingHorizontalList}>
              {pendingAppointments.map((item) => (
                <View key={item.id} style={styles.pendingItem}>
                  <Text style={styles.pendingCategory}>{item.category}</Text>
                  <Text style={styles.pendingItemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.pendingGroupName}>{item.groupName}</Text>

                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => router.push({ pathname: '/vote-appointment', params: { id: item.id } })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.voteButtonText}>ร่วมโหวต / เคาะวัน</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* รายการนัดหมายประจำวัน */}
        {calendarView !== 'year' && (
          <View style={styles.dailySection}>
            <View style={styles.dailySectionHeader}>
              <Text style={styles.dailySectionTitle}>
                นัดหมายวันที่ {formatSelectedDateText(selectedDate)}
              </Text>
              <TouchableOpacity onPress={() => router.push('/schedules')}>
                <Text style={styles.seeAllText}>ดูทั้งหมด</Text>
              </TouchableOpacity>
            </View>

            {filteredAppointments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CalendarIcon size={32} color="#cbd5e1" style={styles.emptyIcon} />
                <Text style={styles.emptyText}>ไม่มีนัดหมายในวันนี้</Text>
              </View>
            ) : (
              filteredAppointments.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push({ pathname: '/appointment-detail', params: { id: item.id } })}
                  activeOpacity={0.85}
                  style={styles.appointmentCard}
                >
                  <View style={styles.timeBadge}>
                    <Clock size={12} color="#4b5563" style={styles.clockIcon} />
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>

                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentTitle}>{item.title}</Text>
                    <View style={styles.locationRow}>
                      <MapPin size={11} color="#9ca3af" style={styles.mapIcon} />
                      <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                    </View>

                    <View style={styles.appointmentFooter}>
                      <View style={styles.avatarStack}>
                        {item.avatars.map((url, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: url }}
                            style={[styles.stackedAvatar, { marginLeft: idx === 0 ? 0 : -8 }]}
                          />
                        ))}
                      </View>
                      <Text style={styles.statusText}>{item.statusText}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal กำหนดสถานะ */}
      <Modal visible={isStatusModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                กำหนดสถานะ {formatSelectedDateText(selectedDate)}
              </Text>
              <TouchableOpacity onPress={() => setIsStatusModalOpen(false)}>
                <X color="#9ca3af" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptions}>
              <TouchableOpacity
                onPress={() => setSelectedStatus(selectedStatus === 'green' ? null : 'green')}
                style={[
                  styles.statusOption,
                  selectedStatus === 'green' && styles.statusOptionGreen
                ]}
              >
                <Text style={[styles.statusOptionText, selectedStatus === 'green' && styles.textGreen]}>
                  ว่าง
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus(selectedStatus === 'orange' ? null : 'orange')}
                style={[
                  styles.statusOption,
                  selectedStatus === 'orange' && styles.statusOptionOrange
                ]}
              >
                <Text style={[styles.statusOptionText, selectedStatus === 'orange' && styles.textOrange]}>
                  อาจจะ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus(selectedStatus === 'red' ? null : 'red')}
                style={[
                  styles.statusOption,
                  selectedStatus === 'red' && styles.statusOptionRed
                ]}
              >
                <Text style={[styles.statusOptionText, selectedStatus === 'red' && styles.textRed]}>
                  ไม่ว่าง
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSaveStatus}
              disabled={isSavingStatus}
              style={styles.saveStatusButton}
              activeOpacity={0.8}
            >
              {isSavingStatus ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveStatusText}>บันทึกสถานะ</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  container: {
    flex: 1,
    backgroundColor: '#cce1de',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#cce1de',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#468f92',
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
    marginRight: 10,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  userNameText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    marginHorizontal: 16,
    marginTop: -20,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 4,
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#609a96',
  },
  tabText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  calendarCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarHeaderLeft: {
    justifyContent: 'flex-start',
  },
  navButton: {
    padding: 6,
  },
  weekHeaderBox: {
    alignItems: 'flex-start',
    flex: 1,
    paddingLeft: 10,
  },
  weekHeaderSubtext: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  weekHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4a3b32',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a3b32',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  yearMonthCard: {
    width: '31%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  yearMonthCardActive: {
    borderColor: '#468f92',
    backgroundColor: 'rgba(70, 143, 146, 0.05)',
  },
  yearMonthText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  yearMonthSubtext: {
    fontSize: 10,
    color: '#4ade80',
    fontWeight: '600',
  },
  yearMonthSubtextActive: {
    color: '#e08955',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCol: {
    width: '14.28%',
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4a3b32',
  },
  sundayText: {
    color: '#e08955',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  dayButtonSelected: {
    backgroundColor: '#b5d5d0',
  },
  dayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a3b32',
  },
  todayText: {
    color: '#e08955',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 4,
  },
  dotGreen: { backgroundColor: '#4ade80' },
  dotOrange: { backgroundColor: '#e08955' },
  dotRed: { backgroundColor: '#f87171' },
  legendText: {
    fontSize: 9,
    color: '#4a3b32',
    fontWeight: 'bold',
  },
  pendingCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 24,
    padding: 14,
    elevation: 2,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#c2410c',
  },
  pendingBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#c2410c',
  },
  pendingSubtitle: {
    fontSize: 10,
    color: '#9a3412',
    marginBottom: 12,
  },
  pendingHorizontalList: {
    gap: 10,
  },
  pendingItem: {
    width: 210,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    elevation: 1,
  },
  pendingCategory: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#c2410c',
    marginBottom: 2,
  },
  pendingItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  pendingGroupName: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 10,
  },
  voteButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  voteButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  dailySection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  dailySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailySectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  appointmentCard: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  timeBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginRight: 10,
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  clockIcon: {
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  appointmentDetails: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    elevation: 1,
  },
  appointmentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mapIcon: {
    marginRight: 4,
  },
  locationText: {
    fontSize: 10,
    color: '#9ca3af',
    flex: 1,
  },
  appointmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#217371',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
    fontSize: 13,
  },
  modalOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    borderColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  statusOptionGreen: {
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  statusOptionOrange: {
    borderColor: '#e08955',
    backgroundColor: 'rgba(224, 137, 85, 0.1)',
  },
  statusOptionRed: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  statusOptionText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#9ca3af',
  },
  textGreen: { color: '#4ade80' },
  textOrange: { color: '#e08955' },
  textRed: { color: '#f87171' },
  saveStatusButton: {
    backgroundColor: '#468f92',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveStatusText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});