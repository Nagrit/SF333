import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Coffee,
  Link2,
  MapPin,
  Plane,
  Plus,
  Repeat,
  Send,
  Smile,
  User,
  Users,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { apiFetch } from '../../services/api';

const COLORS = {
  bg: '#eef5f4',
  headerBg: '#1f5254',
  primary: '#1f5254',
  primarySoft: '#e3eeed',
  select: '#f5b83c',
  selectSoft: '#fdf1da',
  danger: '#ef4444',
  card: '#ffffff',
  textPrimary: '#1a2b2c',
  textSecondary: '#5b6b6c',
  textMuted: '#94a3a2',
  border: '#e1eceb',
  neutralOutline: '#d7e2e1'
};

const CATEGORIES = [
  { key: 'food', label: 'นัดกินข้าว / กาแฟ', color: '#f2a541', Icon: Coffee },
  { key: 'trip', label: 'นัดเที่ยว / กรุ๊ป', color: '#e2572b', Icon: Plane },
  { key: 'work', label: 'ทำงาน / ติวหนังสือ', color: '#2c3a33', Icon: Briefcase },
  { key: 'personal', label: 'ตัวเอง', color: '#8b6fd9', Icon: User }
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

const cardShadow = {
  shadowColor: '#0f2e2f',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2
};

export interface InvitedFriend {
  id: string;
  name: string;
  avatar: string;
  selected: boolean;
}

export interface GroupOption {
  id: string;
  name: string;
}

const RECURRING_OPTIONS = ['ไม่ทำซ้ำ', 'ทำซ้ำทุกวัน', 'ทำซ้ำทุกสัปดาห์', 'ทำซ้ำทุกเดือน'];

// ฟังก์ชันแปลง Date เป็นข้อความภาษาไทย
const formatDateThai = (date: Date) => {
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatTimeThai = (date: Date) => {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

function SectionLabel({ number, children, hint }: { number: number; children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>
        {number}. {children}
      </Text>
      {hint ? <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 3 }}>{hint}</Text> : null}
    </View>
  );
}

function Pill({
  label,
  active,
  activeColor,
  onPress,
  icon
}: {
  label: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        backgroundColor: active ? activeColor : '#ffffff',
        borderColor: active ? activeColor : COLORS.neutralOutline
      }}
    >
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text
        style={{
          fontSize: 12.5,
          fontWeight: '700',
          color: active ? '#ffffff' : COLORS.textSecondary
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FieldInput({
  icon,
  ...props
}: React.ComponentProps<typeof TextInput> & { icon?: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        ...cardShadow
      }}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <TextInput
        placeholderTextColor={COLORS.textMuted}
        style={{ flex: 1, fontSize: 13, color: COLORS.textPrimary, padding: 0 }}
        {...props}
      />
    </View>
  );
}

// ปุ่มสำหรับเปิด Date/Time Picker แบบเลื่อน
function DatePickerButton({
  icon,
  value,
  placeholder,
  onPress
}: {
  icon?: React.ReactNode;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        ...cardShadow
      }}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <Text style={{ flex: 1, fontSize: 13, color: value ? COLORS.textPrimary : COLORS.textMuted }}>
        {value || placeholder}
      </Text>
      <ChevronDown color={COLORS.textMuted} size={16} />
    </TouchableOpacity>
  );
}

function SelectField({
  icon,
  value,
  placeholder,
  options,
  onSelect
}: {
  icon?: React.ReactNode;
  value: string | null;
  placeholder: string;
  options: { label: string; value: string }[];
  onSelect: (v: string) => void;
}) {
  const openPicker = () => {
    Alert.alert(
      placeholder,
      undefined,
      [
        ...options.map(o => ({ text: o.label, onPress: () => onSelect(o.value) })),
        { text: 'ยกเลิก', style: 'cancel' as const }
      ]
    );
  };
  const selectedLabel = options.find(o => o.value === value)?.label || value;


  return (
    <TouchableOpacity
      onPress={openPicker}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        ...cardShadow
      }}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <Text style={{ flex: 1, fontSize: 13, color: selectedLabel ? COLORS.textPrimary : COLORS.textMuted }}>
        {selectedLabel || placeholder}
      </Text>
      <ChevronDown color={COLORS.textMuted} size={16} />
    </TouchableOpacity>
  );
}

function CheckboxRow({
  checked,
  onToggle,
  label,
  hint
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        ...cardShadow
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          borderWidth: checked ? 0 : 1.5,
          borderColor: COLORS.neutralOutline,
          backgroundColor: checked ? COLORS.primary : '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
          marginTop: 1
        }}
      >
        {checked && <Check color="#ffffff" size={13} strokeWidth={3} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{hint}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        ...cardShadow
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flex: 1, marginRight: 10 }}>
          {label}
        </Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#d1d5db', true: COLORS.primary }}
          thumbColor="#ffffff"
        />
      </View>
      <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{hint}</Text>
    </View>
  );
}

export default function CreateAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryKey>('food');

  // นัดกับใคร
  const [withWho, setWithWho] = useState<'individual' | 'group'>('individual');
  const [friends, setFriends] = useState<InvitedFriend[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // รายละเอียดนัดหมาย
  const [tripType, setTripType] = useState<'day' | 'multi'>('day');
  const [meetingMode, setMeetingMode] = useState<'online' | 'inperson'>('inperson');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [accommodation, setAccommodation] = useState('');
  const [topic, setTopic] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // วันที่และเวลา (State สำหรับเก็บวัตถุ Date)
  const [dateVal, setDateVal] = useState<Date>(new Date());
  const [startTimeVal, setStartTimeVal] = useState<Date>(new Date());
  const [endTimeVal, setEndTimeVal] = useState<Date>(new Date());
  const [startDateVal, setStartDateVal] = useState<Date>(new Date());
  const [endDateVal, setEndDateVal] = useState<Date>(new Date());

  // String ที่พร้อมแสดงผลและส่ง API
  const [dateText, setDateText] = useState(formatDateThai(new Date()));
  const [startTime, setStartTime] = useState(formatTimeThai(new Date()));
  const [endTime, setEndTime] = useState(formatTimeThai(new Date()));
  const [startDate, setStartDate] = useState(formatDateThai(new Date()));
  const [endDate, setEndDate] = useState(formatDateThai(new Date()));

  const [appDecide, setAppDecide] = useState(true);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState<string | null>(null);

  // Control สำหรับ DateTimePicker
  const [pickerTarget, setPickerTarget] = useState<'dateText' | 'startTime' | 'endTime' | 'startDate' | 'endDate' | null>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // สถานะและตัวเลือกอื่น
  const [voteEnabled, setVoteEnabled] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // โหลดรายชื่อเพื่อนและกลุ่มจาก API
  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const [friendsRes, groupsRes] = await Promise.all([
        apiFetch<any[]>('/api/friends').catch(() => []),
        apiFetch<any[]>('/api/groups').catch(() => [])
      ]);

      if (friendsRes) {
        setFriends(friendsRes.map(f => ({ id: f.id, name: f.name, avatar: f.avatar, selected: false })));
      }
      if (groupsRes) {
        setGroups(groupsRes.map(g => ({ id: g.id, name: g.name })));
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const toggleFriend = (id: string) => {
    setFriends(prev => prev.map(f => (f.id === id ? { ...f, selected: !f.selected } : f)));
  };

  const handleAddFriend = () => {
    router.push('/groups');
  };

  const handlePickerChange = (event: DateTimePickerChangeEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setPickerTarget(null); // ปิด Picker บน Android หลังเลือกเสร็จ
    }

    if (selectedDate) {
      switch (pickerTarget) {
        case 'dateText':
          setDateVal(selectedDate);
          setDateText(formatDateThai(selectedDate));
          break;
        case 'startTime':
          setStartTimeVal(selectedDate);
          setStartTime(formatTimeThai(selectedDate));
          break;
        case 'endTime':
          setEndTimeVal(selectedDate);
          setEndTime(formatTimeThai(selectedDate));
          break;
        case 'startDate':
          setStartDateVal(selectedDate);
          setStartDate(formatDateThai(selectedDate));
          break;
        case 'endDate':
          setEndDateVal(selectedDate);
          setEndDate(formatDateThai(selectedDate));
          break;
      }
    }
  };

  const openPicker = (target: 'dateText' | 'startTime' | 'endTime' | 'startDate' | 'endDate', mode: 'date' | 'time') => {
    setPickerTarget(target);
    setPickerMode(mode);
  };

  const getPickerValue = () => {
    switch (pickerTarget) {
      case 'dateText': return dateVal;
      case 'startTime': return startTimeVal;
      case 'endTime': return endTimeVal;
      case 'startDate': return startDateVal;
      case 'endDate': return endDateVal;
      default: return new Date();
    }
  };

  const isSolo = category === 'personal';

  // ส่งข้อมูลสร้างนัดหมายไปยัง Fastify API
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อกิจกรรมก่อน');
      return;
    }

    if ((category !== 'work' || meetingMode === 'inperson' || isSolo) && !location.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณาระบุสถานที่นัดหมาย');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedFriendIds = friends.filter(f => f.selected).map(f => f.id);

      const payload = {
        title: title.trim(),
        category,
        withWho: isSolo ? 'solo' : withWho,
        groupId: withWho === 'group' ? selectedGroup : null,
        invitedFriendIds: withWho === 'individual' ? selectedFriendIds : [],
        tripType,
        meetingMode,
        startTime,
        endTime,
        location: location.trim(),
        budget: budget.trim(),
        accommodation: accommodation.trim(),
        topic: topic.trim(),
        meetingLink: meetingLink.trim(),
        appDecide,
        dateText,
        startDate,
        endDate,
        duration,
        notes: notes.trim(),
        recurring,
        voteEnabled: isSolo ? false : voteEnabled,
        notifyEnabled
      };


      await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      Alert.alert(
        'สำเร็จ 🎉',
        isSolo ? 'สร้างนัดหมายเรียบร้อยแล้ว' : 'ส่งคำเชิญนัดหมายเรียบร้อยแล้ว',
        [{ text: 'ตกลง', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถสร้างนัดหมายได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  let sectionCounter = 1;
  const nextSection = () => sectionCounter++;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View
        style={{
          backgroundColor: COLORS.headerBg,
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12,
          paddingBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
          ...cardShadow,
          shadowOpacity: 0.12
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.14)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10
          }}
        >
          <ArrowLeft color="#ffffff" size={20} />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 18 }}>สร้างนัดหมายใหม่</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* 1. ประเภทการนัดหมาย */}
        <SectionLabel number={nextSection()}>ประเภทการนัดหมาย</SectionLabel>
        <FieldInput
          value={title}
          onChangeText={setTitle}
          placeholder="ชื่อกิจกรรม / หัวข้อนัดหมาย"
          icon={<Smile color={COLORS.textMuted} size={16} />}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {CATEGORIES.map(c => (
            <View key={c.key} style={{ width: '48.5%' }}>
              <Pill
                label={c.label}
                active={category === c.key}
                activeColor={c.color}
                onPress={() => setCategory(c.key)}
                icon={<c.Icon color={category === c.key ? '#ffffff' : c.color} size={14} />}
              />
            </View>
          ))}
        </View>

        {/* 2. นัดกับใคร */}
        {!isSolo && (
          <>
            <SectionLabel number={nextSection()}>นัดกับใคร</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Pill
                  label="นัดเพื่อนรายบุคคล"
                  active={withWho === 'individual'}
                  activeColor={COLORS.select}
                  onPress={() => setWithWho('individual')}
                  icon={<Users color={withWho === 'individual' ? '#ffffff' : COLORS.textSecondary} size={14} />}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Pill
                  label="นัดทั้งเพื่อนกลุ่ม"
                  active={withWho === 'group'}
                  activeColor={COLORS.select}
                  onPress={() => setWithWho('group')}
                  icon={<Users color={withWho === 'group' ? '#ffffff' : COLORS.textSecondary} size={14} />}
                />
              </View>
            </View>

            {withWho === 'group' ? (
              <View style={{ marginBottom: 6 }}>
                <SelectField
                  icon={<Users color={COLORS.textMuted} size={16} />}
                  value={selectedGroup}
                  placeholder="เลือกกลุ่มเพื่อนที่เชิญ"
                  options={groups.map(g => ({ label: g.name, value: g.id }))}
                  onSelect={setSelectedGroup}
                />
              </View>
            ) : (
              <View style={{ marginBottom: 18 }}>
                {isLoadingData ? (
                  <ActivityIndicator color={COLORS.primary} size="small" style={{ marginVertical: 10 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {friends.map(f => (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => toggleFriend(f.id)}
                        activeOpacity={0.8}
                        style={{ alignItems: 'center', marginRight: 16, opacity: f.selected ? 1 : 0.4 }}
                      >
                        <View>
                          <Image
                            source={{ uri: f.avatar }}
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 25,
                              marginBottom: 6,
                              borderWidth: f.selected ? 2 : 0,
                              borderColor: COLORS.select
                            }}
                          />
                          {f.selected && (
                            <View
                              style={{
                                position: 'absolute',
                                bottom: 4,
                                right: -2,
                                width: 17,
                                height: 17,
                                borderRadius: 9,
                                backgroundColor: COLORS.danger,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1.5,
                                borderColor: '#ffffff'
                              }}
                            >
                              <X color="#ffffff" size={10} strokeWidth={3} />
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary }}>{f.name}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={handleAddFriend} activeOpacity={0.85} style={{ alignItems: 'center' }}>
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          backgroundColor: COLORS.selectSoft,
                          borderWidth: 1.5,
                          borderColor: COLORS.select,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 6
                        }}
                      >
                        <Plus color={COLORS.select} size={20} strokeWidth={2.5} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.select }}>เพิ่มเพื่อน</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}
              </View>
            )}
          </>
        )}

        {/* 3. รายละเอียดนัดหมาย */}
        <SectionLabel number={nextSection()}>
          {isSolo
            ? 'รายละเอียด'
            : category === 'trip'
              ? 'รายละเอียดนัดหมาย (ทริปเที่ยว)'
              : category === 'work'
                ? 'รายละเอียดนัดหมาย (การประชุม)'
                : 'รายละเอียดนัดหมาย (ร้านอาหาร/สถานที่)'}
        </SectionLabel>

        {category === 'trip' && !isSolo && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Pill
                label="ไปเช้า-เย็นกลับ"
                active={tripType === 'day'}
                activeColor={COLORS.select}
                onPress={() => setTripType('day')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Pill
                label="เที่ยวหลายวัน"
                active={tripType === 'multi'}
                activeColor={COLORS.select}
                onPress={() => setTripType('multi')}
              />
            </View>
          </View>
        )}

        {category === 'work' && !isSolo && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Pill
                label="ประชุมออนไลน์"
                active={meetingMode === 'online'}
                activeColor={COLORS.select}
                onPress={() => setMeetingMode('online')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Pill
                label="เจอตัวจริง"
                active={meetingMode === 'inperson'}
                activeColor={COLORS.select}
                onPress={() => setMeetingMode('inperson')}
              />
            </View>
          </View>
        )}

        {category === 'work' && !isSolo && (
          <FieldInput value={topic} onChangeText={setTopic} placeholder="หัวข้อ" />
        )}
        {category === 'work' && !isSolo && meetingMode === 'online' && (
          <FieldInput
            value={meetingLink}
            onChangeText={setMeetingLink}
            placeholder="ลิงก์ประชุม"
            icon={<Link2 color={COLORS.textMuted} size={16} />}
          />
        )}

        {(category !== 'work' || isSolo || meetingMode === 'inperson') && (
          <FieldInput
            value={location}
            onChangeText={setLocation}
            placeholder="สถานที่นัดหมาย"
            icon={<MapPin color={COLORS.textMuted} size={16} />}
          />
        )}

        {category === 'food' && !isSolo && (
          <FieldInput value={budget} onChangeText={setBudget} placeholder="งบประมาณคร่าว (ไม่บังคับ)" />
        )}
        {category === 'trip' && !isSolo && (
          <>
            <FieldInput value={budget} onChangeText={setBudget} placeholder="งบประมาณคร่าว (ไม่บังคับ)" />
            {tripType === 'multi' && (
              <FieldInput value={accommodation} onChangeText={setAccommodation} placeholder="ที่พัก / โรงแรม (ถ้ามี)" />
            )}
          </>
        )}

        <View style={{ marginBottom: 6 }} />

        {/* 4. วันที่และเวลานัดหมาย */}
        <SectionLabel number={nextSection()}>วันที่และเวลานัดหมาย</SectionLabel>

        {!isSolo && (
          <CheckboxRow
            checked={appDecide}
            onToggle={() => setAppDecide(v => !v)}
            label="ให้แอปช่วยวิเคราะห์หาเวลาที่เหมาะสม ✨"
            hint="วิเคราะห์ตารางของทุกคน เพื่อแนะนำช่วงเวลาที่เหมาะสมที่สุด"
          />
        )}

        {isSolo ? (
          <>
            <DatePickerButton
              icon={<Calendar color={COLORS.textMuted} size={16} />}
              value={dateText}
              placeholder="เลือกวันที่นัดหมาย"
              onPress={() => openPicker('dateText', 'date')}
            />
            <FieldInput value={notes} onChangeText={setNotes} placeholder="หมายเหตุ / สิ่งที่ต้องเตรียมไป" />
            <SelectField
              icon={<Repeat color={COLORS.textMuted} size={16} />}
              value={recurring}
              placeholder="ทำประจำ"
              options={RECURRING_OPTIONS.map(o => ({ label: o, value: o }))}
              onSelect={setRecurring}
            />
          </>
        ) : category === 'trip' && tripType === 'multi' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <DatePickerButton
                  icon={<Calendar color={COLORS.textMuted} size={16} />}
                  value={startDate}
                  placeholder="วันเดินทางไป"
                  onPress={() => openPicker('startDate', 'date')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerButton
                  icon={<Calendar color={COLORS.textMuted} size={16} />}
                  value={endDate}
                  placeholder="วันเดินทางกลับ"
                  onPress={() => openPicker('endDate', 'date')}
                />
              </View>
            </View>
            <FieldInput value={duration} onChangeText={setDuration} placeholder="ระยะเวลา (เช่น 3 วัน 2 คืน)" />
            <FieldInput value={notes} onChangeText={setNotes} placeholder="หมายเหตุ / สิ่งที่ต้องเตรียมไป" />
          </>
        ) : (
          <>
            <DatePickerButton
              icon={<Calendar color={COLORS.textMuted} size={16} />}
              value={dateText}
              placeholder="เลือกวันที่นัดหมาย"
              onPress={() => openPicker('dateText', 'date')}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <DatePickerButton
                  icon={<Clock color={COLORS.textMuted} size={16} />}
                  value={startTime}
                  placeholder="เวลาเริ่ม"
                  onPress={() => openPicker('startTime', 'time')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerButton
                  icon={<Clock color={COLORS.textMuted} size={16} />}
                  value={endTime}
                  placeholder="เวลาสิ้นสุด"
                  onPress={() => openPicker('endTime', 'time')}
                />
              </View>
            </View>
            <FieldInput value={notes} onChangeText={setNotes} placeholder="หมายเหตุ / สิ่งที่ต้องเตรียมไป" />
          </>
        )}

        {!isSolo && (
          <ToggleRow
            label="เปิดให้โหวตวันเวลา"
            hint="สถานะจะเป็น รอยืนยัน จนกว่าจะโหวตครบทุกคน"
            value={voteEnabled}
            onValueChange={setVoteEnabled}
          />
        )}

        <ToggleRow
          label="เปิดแจ้งเตือน"
          hint="เตือนล่วงหน้า 1 ชั่วโมง ก่อนเวลานัด"
          value={notifyEnabled}
          onValueChange={setNotifyEnabled}
        />

        <View style={{ height: 8 }} />

        {/* ปุ่มส่ง */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.88}
          style={{
            flexDirection: 'row',
            backgroundColor: COLORS.primary,
            borderRadius: 15,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              {isSolo ? (
                <Check color="#ffffff" size={16} style={{ marginRight: 8 }} />
              ) : (
                <Send color="#ffffff" size={16} style={{ marginRight: 8 }} />
              )}
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>
                {isSolo ? 'สร้าง' : 'ส่งคำเชิญนัดหมาย'}
              </Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* DateTimePicker Modal สำหรับ iOS / Floating สำหรับ Android */}
      {pickerTarget !== null && (
        <View style={Platform.OS === 'ios' ? { backgroundColor: '#ffffff', paddingBottom: insets.bottom + 10, borderTopWidth: 1, borderColor: COLORS.border } : undefined}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={() => setPickerTarget(null)}
              style={{ alignSelf: 'flex-end', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 15 }}>ตกลง</Text>
            </TouchableOpacity>
          )}
          <DateTimePicker
            value={getPickerValue()}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handlePickerChange}
            onDismiss={() => setPickerTarget(null)}
            is24Hour
            locale="th-TH"
          />
        </View>
      )}
    </View>
  );
}