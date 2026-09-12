import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Switch,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
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

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const COLORS = {
  bg: '#eef5f4',
  headerBg: '#1f5254',
  primary: '#1f5254',        // ปุ่มหลัก / checkbox / switch
  primarySoft: '#e3eeed',
  select: '#f5b83c',         // สีเหลืองอำพัน ใช้กับตัวเลือกย่อยทั่วไป (นัดกับใคร, รายละเอียดนัดหมาย)
  selectSoft: '#fdf1da',
  danger: '#ef4444',
  card: '#ffffff',
  textPrimary: '#1a2b2c',
  textSecondary: '#5b6b6c',
  textMuted: '#94a3a2',
  border: '#e1eceb',
  neutralOutline: '#d7e2e1'
};

// สีประจำประเภทนัดหมายแต่ละแบบ
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

interface InvitedFriend {
  id: string;
  name: string;
  avatar: string;
  selected: boolean;
}

const INITIAL_FRIENDS: InvitedFriend[] = [
  { id: '1', name: 'เจดน์', avatar: 'https://picsum.photos/seed/m1/100', selected: true },
  { id: '2', name: 'มินท์', avatar: 'https://picsum.photos/seed/m2/100', selected: true },
  { id: '3', name: 'เป้', avatar: 'https://picsum.photos/seed/m3/100', selected: true },
  { id: '4', name: 'ส้ม', avatar: 'https://picsum.photos/seed/m4/100', selected: true },
];

const GROUP_OPTIONS = ['แก๊งเที่ยว 8 คน', 'เพื่อนซี้ 4 คน', 'ทีมงานโปรเจกต์', 'ครอบครัว'];
const RECURRING_OPTIONS = ['ไม่ทำซ้ำ', 'ทำซ้ำทุกวัน', 'ทำซ้ำทุกสัปดาห์', 'ทำซ้ำทุกเดือน'];

// ---------------------------------------------------------------------------
// Reusable pieces
// ---------------------------------------------------------------------------

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
  options: string[];
  onSelect: (v: string) => void;
}) {
  const openPicker = () => {
    Alert.alert(
      placeholder,
      undefined,
      [
        ...options.map(o => ({ text: o, onPress: () => onSelect(o) })),
        { text: 'ยกเลิก', style: 'cancel' as const }
      ]
    );
  };
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
      <Text style={{ flex: 1, fontSize: 13, color: value ? COLORS.textPrimary : COLORS.textMuted }}>
        {value || placeholder}
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

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CreateAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryKey>('food');

  // นัดกับใคร
  const [withWho, setWithWho] = useState<'individual' | 'group'>('individual');
  const [friends, setFriends] = useState<InvitedFriend[]>(INITIAL_FRIENDS);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // รายละเอียดนัดหมาย (แปรผันตามประเภท)
  const [tripType, setTripType] = useState<'day' | 'multi'>('day');
  const [meetingMode, setMeetingMode] = useState<'online' | 'inperson'>('inperson');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [accommodation, setAccommodation] = useState('');
  const [topic, setTopic] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // วันที่และเวลา
  const [appDecide, setAppDecide] = useState(true);
  const [dateText, setDateText] = useState('เสาร์ที่ 21 ก.พ. 2026');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState<string | null>(null);

  // ท้ายฟอร์ม
  const [voteEnabled, setVoteEnabled] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  const toggleFriend = (id: string) => {
    setFriends(prev => prev.map(f => (f.id === id ? { ...f, selected: !f.selected } : f)));
  };

  const handleAddFriend = () => {
    Alert.alert('เชิญเพื่อน', 'เลือกเพื่อนเพิ่มเติมจากรายชื่อกลุ่มของคุณ', [
      { text: 'ไปที่กลุ่ม', onPress: () => router.push('/groups') },
      { text: 'ปิด', style: 'cancel' }
    ]);
  };

  const isSolo = category === 'personal';
  const activeCategory = CATEGORIES.find(c => c.key === category)!;

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อกิจกรรมก่อน');
      return;
    }
    if (!location.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณาระบุสถานที่นัดหมาย');
      return;
    }
    Alert.alert(
      'สำเร็จ 🎉',
      isSolo ? 'สร้างนัดหมายเรียบร้อยแล้ว' : 'ส่งคำเชิญนัดหมายเรียบร้อยแล้ว',
      [{ text: 'ตกลง', onPress: () => router.back() }]
    );
  };

  const invitedCount = friends.filter(f => f.selected).length;

  // นับเลขหัวข้อให้เรียงถูกต้องอัตโนมัติ แม้บางส่วนจะถูกซ่อนไปตามประเภทนัดหมาย
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
          placeholder="ชวนกับชาวแก๊งค์"
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

        {/* 2. นัดกับใคร (ซ่อนสำหรับนัดหมายส่วนตัว) */}
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
                  options={GROUP_OPTIONS}
                  onSelect={setSelectedGroup}
                />
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
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
          </>
        )}

        {/* 3. รายละเอียดนัดหมาย (แปรผันตามประเภท) */}
        <SectionLabel
          number={nextSection()}
          hint={isSolo ? undefined : undefined}
        >
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

        {(category === 'work') && !isSolo && (
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
            placeholder="เช่น Shabu Baru, Siam Paragon ชั้น 4"
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

        {/* วันที่และเวลานัดหมาย */}
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
            <FieldInput
              value={dateText}
              onChangeText={setDateText}
              placeholder="วันที่นัดหมาย"
              icon={<Calendar color={COLORS.textMuted} size={16} />}
            />
            <FieldInput value={notes} onChangeText={setNotes} placeholder="หมายเหตุ / สิ่งที่ต้องเตรียมไป" />
            <SelectField
              icon={<Repeat color={COLORS.textMuted} size={16} />}
              value={recurring}
              placeholder="ทำประจำ"
              options={RECURRING_OPTIONS}
              onSelect={setRecurring}
            />
          </>
        ) : category === 'trip' && tripType === 'multi' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <FieldInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="วันเดินทางไป"
                  icon={<Calendar color={COLORS.textMuted} size={16} />}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="วันเดินทางกลับ"
                  icon={<Calendar color={COLORS.textMuted} size={16} />}
                />
              </View>
            </View>
            <FieldInput value={duration} onChangeText={setDuration} placeholder="ระยะเวลา (เช่น 3 วัน 2 คืน)" />
            <FieldInput value={notes} onChangeText={setNotes} placeholder="หมายเหตุ / สิ่งที่ต้องเตรียมไป" />
          </>
        ) : (
          <>
            <FieldInput
              value={dateText}
              onChangeText={setDateText}
              placeholder="วันที่นัดหมาย"
              icon={<Calendar color={COLORS.textMuted} size={16} />}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <FieldInput
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="เวลาเริ่ม"
                  icon={<Clock color={COLORS.textMuted} size={16} />}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldInput
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="เวลาสิ้นสุด"
                  icon={<Clock color={COLORS.textMuted} size={16} />}
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
          {isSolo ? (
            <Check color="#ffffff" size={16} style={{ marginRight: 8 }} />
          ) : (
            <Send color="#ffffff" size={16} style={{ marginRight: 8 }} />
          )}
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>
            {isSolo ? 'สร้าง' : 'ส่งคำเชิญนัดหมาย'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
