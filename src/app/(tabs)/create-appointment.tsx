import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
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
  Plane,
  Plus,
  Repeat,
  Send,
  Smile,
  User,
  Users,
  X,
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceAutocomplete, {
  SelectedPlace,
} from '../../components/PlaceAutocomplete';
import { apiFetch } from '../../services/api';
import type {
  AppointmentPoll,
  PollKind,
  PollOption,
} from '../../types/appointmentPoll';

const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

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
  neutralOutline: '#d7e2e1',
};

const CATEGORIES = [
  {
    key: 'food',
    label: 'นัดกินข้าว / กาแฟ',
    color: '#f2a541',
    Icon: Coffee,
  },
  {
    key: 'trip',
    label: 'นัดเที่ยว / กรุ๊ป',
    color: '#e2572b',
    Icon: Plane,
  },
  {
    key: 'work',
    label: 'ทำงาน / ติวหนังสือ',
    color: '#2c3a33',
    Icon: Briefcase,
  },
  {
    key: 'personal',
    label: 'ตัวเอง',
    color: '#8b6fd9',
    Icon: User,
  },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

type PollPickerField = 'date' | 'startTime' | 'endTime';

type PickerTarget =
  | 'dateText'
  | 'startTime'
  | 'endTime'
  | 'startDate'
  | 'endDate'
  | {
    type: 'poll';
    pollId: string;
    optionId: string;
    field: PollPickerField;
  };

const cardShadow = {
  shadowColor: '#0f2e2f',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
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

const RECURRING_OPTIONS = [
  'ไม่ทำซ้ำ',
  'ทำซ้ำทุกวัน',
  'ทำซ้ำทุกสัปดาห์',
  'ทำซ้ำทุกเดือน',
];

const formatDateThai = (date: Date) =>
  date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatTimeThai = (date: Date) =>
  date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/** แปลงวันที่เป็น YYYY-MM-DD โดยใช้เวลาท้องถิ่น */
function dateToKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** แปลง YYYY-MM-DD เป็น Date โดยไม่ให้วันที่เลื่อนเพราะ timezone */
function parseDateKey(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** ตรวจสอบและแยกเวลา HH:mm */
function parseTimeValue(
  value?: string,
): { hours: number; minutes: number } | null {
  if (!value || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return { hours, minutes };
}

function formatTimeValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/** สร้าง Date เริ่มต้นสำหรับ DateTimePicker ของตัวเลือกโหวต */
function getPollOptionDate(
  option: PollOption,
  field: PollPickerField,
): Date {
  const date = parseDateKey(option.date) ?? new Date();

  if (field === 'date') {
    return date;
  }

  const time = parseTimeValue(
    field === 'startTime' ? option.startTime : option.endTime,
  );

  if (time) {
    date.setHours(time.hours, time.minutes, 0, 0);
  }

  return date;
}

/** แปลงตัวเลือกโหวตเป็นรูปแบบที่ API รองรับ */
function buildPollOptionPayload(option: PollOption) {
  const date = parseDateKey(option.date);
  const start = parseTimeValue(option.startTime);
  const end = parseTimeValue(option.endTime);

  const toIso = (
    time: { hours: number; minutes: number } | null,
  ): string | null => {
    if (!date || !time) {
      return null;
    }

    const value = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.hours,
      time.minutes,
      0,
      0,
    );

    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  };

  return {
    label: option.label.trim(),
    startAt: toIso(start),
    endAt: toIso(end),
  };
}

function SectionLabel({
  number,
  children,
  hint,
}: {
  number: number;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: COLORS.textPrimary,
        }}
      >
        {number}. {children}
      </Text>

      {hint ? (
        <Text
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
            marginTop: 3,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function Pill({
  label,
  active,
  activeColor,
  onPress,
  icon,
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
        borderColor: active ? activeColor : COLORS.neutralOutline,
      }}
    >
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}

      <Text
        style={{
          fontSize: 12.5,
          fontWeight: '700',
          color: active ? '#ffffff' : COLORS.textSecondary,
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
}: React.ComponentProps<typeof TextInput> & {
  icon?: React.ReactNode;
}) {
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
        ...cardShadow,
      }}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}

      <TextInput
        placeholderTextColor={COLORS.textMuted}
        style={{
          flex: 1,
          fontSize: 13,
          color: COLORS.textPrimary,
          padding: 0,
        }}
        {...props}
      />
    </View>
  );
}

function DatePickerButton({
  icon,
  value,
  placeholder,
  onPress,
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
        ...cardShadow,
      }}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}

      <Text
        style={{
          flex: 1,
          fontSize: 13,
          color: value ? COLORS.textPrimary : COLORS.textMuted,
        }}
      >
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
  onSelect,
}: {
  icon?: React.ReactNode;
  value: string | null;
  placeholder: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}) {
  const openPicker = () => {
    Alert.alert(placeholder, undefined, [
      ...options.map((option) => ({
        text: option.label,
        onPress: () => onSelect(option.value),
      })),
      { text: 'ยกเลิก', style: 'cancel' as const },
    ]);
  };

  const selectedLabel =
    options.find((option) => option.value === value)?.label || value;

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
        ...cardShadow,
      }}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}

      <Text
        style={{
          flex: 1,
          fontSize: 13,
          color: selectedLabel ? COLORS.textPrimary : COLORS.textMuted,
        }}
      >
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
  hint,
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
        ...cardShadow,
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
          marginTop: 1,
        }}
      >
        {checked ? (
          <Check color="#ffffff" size={13} strokeWidth={3} />
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: COLORS.textPrimary,
          }}
        >
          {label}
        </Text>

        {hint ? (
          <Text
            style={{
              fontSize: 11,
              color: COLORS.textMuted,
              marginTop: 2,
            }}
          >
            {hint}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
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
        ...cardShadow,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: COLORS.textPrimary,
            flex: 1,
            marginRight: 10,
          }}
        >
          {label}
        </Text>

        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{
            false: '#d1d5db',
            true: COLORS.primary,
          }}
          thumbColor="#ffffff"
        />
      </View>

      <Text
        style={{
          fontSize: 11,
          color: COLORS.textMuted,
          marginTop: 4,
        }}
      >
        {hint}
      </Text>
    </View>
  );
}

export default function CreateAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedPlace, setSelectedPlace] =
    useState<SelectedPlace | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryKey>('food');

  // นัดกับใคร
  const [withWho, setWithWho] = useState<'individual' | 'group'>(
    'individual',
  );
  const [friends, setFriends] = useState<InvitedFriend[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // รายละเอียดนัดหมาย
  const [tripType, setTripType] = useState<'day' | 'multi'>('day');
  const [meetingMode, setMeetingMode] = useState<'online' | 'inperson'>(
    'inperson',
  );
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [accommodation, setAccommodation] = useState('');
  const [topic, setTopic] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // วันที่และเวลานัดหมายหลัก
  const [dateVal, setDateVal] = useState<Date>(new Date());
  const [startTimeVal, setStartTimeVal] = useState<Date>(new Date());
  const [endTimeVal, setEndTimeVal] = useState<Date>(new Date());
  const [startDateVal, setStartDateVal] = useState<Date>(new Date());
  const [endDateVal, setEndDateVal] = useState<Date>(new Date());

  const [dateText, setDateText] = useState(formatDateThai(new Date()));
  const [startTime, setStartTime] = useState(formatTimeThai(new Date()));
  const [endTime, setEndTime] = useState(formatTimeThai(new Date()));
  const [startDate, setStartDate] = useState(formatDateThai(new Date()));
  const [endDate, setEndDate] = useState(formatDateThai(new Date()));

  const [appDecide, setAppDecide] = useState(true);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState<string | null>(null);

  // DateTimePicker รองรับทั้งฟิลด์นัดหมายหลักและตัวเลือกโหวต
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(
    null,
  );
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // สถานะและตัวเลือกอื่น
  const [voteEnabled, setVoteEnabled] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [polls, setPolls] = useState<AppointmentPoll[]>([]);

  const addPoll = (kind: PollKind = 'date') => {
    setPolls((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: '',
        kind,
        required: false,
        options: [],
      },
    ]);
  };

  const updatePoll = (
    pollId: string,
    patch: Partial<AppointmentPoll>,
  ) => {
    setPolls((current) =>
      current.map((poll) =>
        poll.id === pollId ? { ...poll, ...patch } : poll,
      ),
    );
  };

  const removePoll = (pollId: string) => {
    setPolls((current) =>
      current.filter((poll) => poll.id !== pollId),
    );
  };

  const addPollOption = (pollId: string, option: PollOption) => {
    setPolls((current) =>
      current.map((poll) =>
        poll.id === pollId
          ? { ...poll, options: [...poll.options, option] }
          : poll,
      ),
    );
  };

  const removePollOption = (pollId: string, optionId: string) => {
    setPolls((current) =>
      current.map((poll) =>
        poll.id === pollId
          ? {
            ...poll,
            options: poll.options.filter(
              (option) => option.id !== optionId,
            ),
          }
          : poll,
      ),
    );
  };

  const updatePollOption = (
    pollId: string,
    optionId: string,
    label: string,
  ) => {
    setPolls((current) =>
      current.map((poll) =>
        poll.id === pollId
          ? {
            ...poll,
            options: poll.options.map((option) =>
              option.id === optionId
                ? { ...option, label }
                : option,
            ),
          }
          : poll,
      ),
    );
  };

  const updatePollOptionField = (
    pollId: string,
    optionId: string,
    field: PollPickerField,
    value: string,
  ) => {
    setPolls((current) =>
      current.map((poll) =>
        poll.id === pollId
          ? {
            ...poll,
            options: poll.options.map((option) =>
              option.id === optionId
                ? { ...option, [field]: value }
                : option,
            ),
          }
          : poll,
      ),
    );
  };

  const openPollPicker = (
    pollId: string,
    optionId: string,
    field: PollPickerField,
  ) => {
    setPickerMode(field === 'date' ? 'date' : 'time');
    setPickerTarget({
      type: 'poll',
      pollId,
      optionId,
      field,
    });
  };

  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoadingData(true);

      const [friendsRes, groupsRes] = await Promise.all([
        apiFetch<any[]>('/api/friends').catch(() => []),
        apiFetch<any[]>('/api/groups').catch(() => []),
      ]);

      if (friendsRes) {
        setFriends(
          friendsRes.map((friend) => ({
            id: friend.id,
            name: friend.name,
            avatar: friend.avatar,
            selected: false,
          })),
        );
      }

      if (groupsRes) {
        setGroups(
          groupsRes.map((group) => ({
            id: group.id,
            name: group.name,
          })),
        );
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
    setFriends((previous) =>
      previous.map((friend) =>
        friend.id === id
          ? { ...friend, selected: !friend.selected }
          : friend,
      ),
    );
  };

  const handleAddFriend = () => {
    router.push('/groups');
  };

  const openPicker = (
    target: Exclude<PickerTarget, { type: 'poll' }>,
    mode: 'date' | 'time',
  ) => {
    setPickerTarget(target);
    setPickerMode(mode);
  };

  const handlePickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    // Android ใช้ native dialog จึงปิดหลังเลือกหรือยกเลิก
    if (Platform.OS === 'android') {
      setPickerTarget(null);
    }

    if (event.type === 'dismissed' || !selectedDate || !pickerTarget) {
      return;
    }

    // กรณีเลือกวันที่หรือเวลาของตัวเลือกโหวต
    if (
      typeof pickerTarget === 'object' &&
      pickerTarget.type === 'poll'
    ) {
      const { pollId, optionId, field } = pickerTarget;

      const value =
        field === 'date'
          ? dateToKey(selectedDate)
          : formatTimeValue(selectedDate);

      updatePollOptionField(pollId, optionId, field, value);
      return;
    }

    console.log('[DatePicker Debug]', {
      pickerTarget,
      selectedDate: selectedDate.toString(),
      selectedDateISO: selectedDate.toISOString(),
      localDateKey: dateToKey(selectedDate),
    });

    // กรณีเลือกวันที่หรือเวลาของนัดหมายหลัก
    switch (pickerTarget) {
      case 'dateText':
        setDateVal(selectedDate);
        setDateText(formatDateThai(selectedDate));

        // กิจกรรมที่ไม่ใช่ทริปหลายวัน ให้วันที่นัดหมาย
        // และวันที่เริ่มต้นตรงกัน
        if (!(category === 'trip' && tripType === 'multi')) {
          setStartDateVal(selectedDate);
          setStartDate(formatDateThai(selectedDate));
        }
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
  };

  const getPickerValue = (): Date => {
    if (
      pickerTarget &&
      typeof pickerTarget === 'object' &&
      pickerTarget.type === 'poll'
    ) {
      const poll = polls.find(
        (item) => item.id === pickerTarget.pollId,
      );
      const option = poll?.options.find(
        (item) => item.id === pickerTarget.optionId,
      );

      if (option) {
        return getPollOptionDate(option, pickerTarget.field);
      }

      return new Date();
    }

    switch (pickerTarget) {
      case 'dateText':
        return dateVal;
      case 'startTime':
        return startTimeVal;
      case 'endTime':
        return endTimeVal;
      case 'startDate':
        return startDateVal;
      case 'endDate':
        return endDateVal;
      default:
        return new Date();
    }
  };

  const isSolo = category === 'personal';

  function validateAppointment(): string | null {
    if (!title.trim()) {
      return 'กรุณาระบุชื่อกิจกรรม';
    }

    if (
      (category !== 'work' ||
        meetingMode === 'inperson' ||
        isSolo) &&
      !location.trim()
    ) {
      return 'กรุณาระบุสถานที่นัดหมาย';
    }

    if (!isSolo && withWho === 'group' && !selectedGroup) {
      return 'กรุณาเลือกกลุ่มเพื่อน';
    }

    if (
      !isSolo &&
      withWho === 'individual' &&
      !friends.some((friend) => friend.selected)
    ) {
      return 'กรุณาเลือกเพื่อนอย่างน้อยหนึ่งคน';
    }

    if (
      category === 'work' &&
      !isSolo &&
      meetingMode === 'online' &&
      !meetingLink.trim()
    ) {
      return 'กรุณาระบุลิงก์ประชุม';
    }

    if (!isSolo && voteEnabled) {
      if (polls.length === 0) {
        return 'กรุณาเพิ่มหัวข้อโหวตอย่างน้อยหนึ่งหัวข้อ';
      }

      for (const poll of polls) {
        if (!poll.title.trim()) {
          return 'กรุณากรอกชื่อหัวข้อโหวต';
        }

        if (poll.options.length < 2) {
          return `หัวข้อ "${poll.title}" ต้องมีตัวเลือกอย่างน้อย 2 รายการ`;
        }

        if (poll.options.some((option) => !option.label.trim())) {
          return `กรุณาตรวจสอบตัวเลือกในหัวข้อ "${poll.title}"`;
        }

        // หัวข้อประเภท date/time ต้องมีวันที่และเวลาให้ครบ
        if (poll.kind === 'date' || poll.kind === 'time') {
          for (const option of poll.options) {
            if (!parseDateKey(option.date)) {
              return `กรุณาเลือกวันที่สำหรับตัวเลือกในหัวข้อ "${poll.title}"`;
            }

            if (!parseTimeValue(option.startTime)) {
              return `กรุณาเลือกเวลาเริ่มต้นสำหรับตัวเลือกในหัวข้อ "${poll.title}"`;
            }

            if (!parseTimeValue(option.endTime)) {
              return `กรุณาเลือกเวลาสิ้นสุดสำหรับตัวเลือกในหัวข้อ "${poll.title}"`;
            }

            const payload = buildPollOptionPayload(option);

            if (!payload.startAt || !payload.endAt) {
              return `วันที่หรือเวลาในหัวข้อ "${poll.title}" ไม่ถูกต้อง`;
            }

            if (
              new Date(payload.endAt).getTime() <=
              new Date(payload.startAt).getTime()
            ) {
              return `เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้นในหัวข้อ "${poll.title}"`;
            }
          }
        }
      }
    }

    return null;
  }

  const handleSubmit = async () => {
    const validationError = validateAppointment();

    if (validationError) {
      Alert.alert('ตรวจสอบข้อมูล', validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      const selectedFriendIds = friends
        .filter((friend) => friend.selected)
        .map((friend) => friend.id);

      // API รับ startAt/endAt ไม่ใช่ date/startTime/endTime
      const pollsPayload =
        !isSolo && voteEnabled
          ? polls.map((poll) => ({
            title: poll.title.trim(),
            kind: poll.kind,
            required: poll.required,
            options: poll.options.map(buildPollOptionPayload),
          }))
          : [];

      const payload = {
        title: title.trim(),
        category,
        withWho: isSolo ? 'solo' : withWho,
        groupId: !isSolo && withWho === 'group' ? selectedGroup : null,
        invitedFriendIds:
          !isSolo && withWho === 'individual' ? selectedFriendIds : [],

        tripType,
        meetingMode,

        // ใช้ค่าจาก DateTimePicker โดยตรง
        dateText: dateToKey(dateVal),
        startTime: formatTimeValue(startTimeVal),
        endTime: formatTimeValue(endTimeVal),
        startDate: dateToKey(startDateVal),
        endDate: dateToKey(endDateVal),

        location: location.trim(),
        budget: budget.trim(),
        accommodation: accommodation.trim(),
        topic: topic.trim(),
        meetingLink: meetingLink.trim(),
        appDecide,
        duration,
        notes: notes.trim(),
        recurring,
        voteEnabled: isSolo ? false : voteEnabled,
        notifyEnabled,

        place: selectedPlace
          ? {
            placeId: selectedPlace.placeId,
            name: selectedPlace.name,
            address: selectedPlace.address,
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude,
          }
          : null,

        polls: pollsPayload,
      };

      console.log('[Appointment Payload Debug]', {
        dateVal: dateToKey(dateVal),
        startDateVal: dateToKey(startDateVal),
        endDateVal: dateToKey(endDateVal),
        payloadStartDate: payload.startDate,
        payloadDateText: payload.dateText,
      });

      await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      Alert.alert(
        'สำเร็จ 🎉',
        isSolo
          ? 'สร้างนัดหมายเรียบร้อยแล้ว'
          : 'ส่งคำเชิญนัดหมายเรียบร้อยแล้ว',
        [{ text: 'ตกลง', onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        error.message || 'ไม่สามารถสร้างนัดหมายได้',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  let sectionCounter = 1;
  const nextSection = () => sectionCounter++;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View
        style={{
          backgroundColor: COLORS.headerBg,
          paddingHorizontal: 20,
          paddingTop:
            Math.max(
              insets.top,
              Platform.OS === 'android'
                ? StatusBar.currentHeight || 24
                : 12,
            ) + 12,
          paddingBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
          ...cardShadow,
          shadowOpacity: 0.12,
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
            marginRight: 10,
          }}
        >
          <ArrowLeft color="#ffffff" size={20} />
        </TouchableOpacity>

        <Text
          style={{
            color: '#ffffff',
            fontWeight: '700',
            fontSize: 18,
          }}
        >
          สร้างนัดหมายใหม่
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
      >
        {/* 1. ประเภทการนัดหมาย */}
        <SectionLabel number={nextSection()}>
          ประเภทการนัดหมาย
        </SectionLabel>

        <FieldInput
          value={title}
          onChangeText={setTitle}
          placeholder="ชื่อกิจกรรม / หัวข้อนัดหมาย"
          icon={<Smile color={COLORS.textMuted} size={16} />}
        />

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 18,
          }}
        >
          {CATEGORIES.map((item) => (
            <View key={item.key} style={{ width: '48.5%' }}>
              <Pill
                label={item.label}
                active={category === item.key}
                activeColor={item.color}
                onPress={() => setCategory(item.key)}
                icon={
                  <item.Icon
                    color={
                      category === item.key
                        ? '#ffffff'
                        : item.color
                    }
                    size={14}
                  />
                }
              />
            </View>
          ))}
        </View>

        {/* 2. นัดกับใคร */}
        {!isSolo && (
          <>
            <SectionLabel number={nextSection()}>
              นัดกับใคร
            </SectionLabel>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Pill
                  label="นัดเพื่อนรายบุคคล"
                  active={withWho === 'individual'}
                  activeColor={COLORS.select}
                  onPress={() => setWithWho('individual')}
                  icon={
                    <Users
                      color={
                        withWho === 'individual'
                          ? '#ffffff'
                          : COLORS.textSecondary
                      }
                      size={14}
                    />
                  }
                />
              </View>

              <View style={{ flex: 1 }}>
                <Pill
                  label="นัดทั้งเพื่อนกลุ่ม"
                  active={withWho === 'group'}
                  activeColor={COLORS.select}
                  onPress={() => setWithWho('group')}
                  icon={
                    <Users
                      color={
                        withWho === 'group'
                          ? '#ffffff'
                          : COLORS.textSecondary
                      }
                      size={14}
                    />
                  }
                />
              </View>
            </View>

            {withWho === 'group' ? (
              <View style={{ marginBottom: 6 }}>
                <SelectField
                  icon={<Users color={COLORS.textMuted} size={16} />}
                  value={selectedGroup}
                  placeholder="เลือกกลุ่มเพื่อนที่เชิญ"
                  options={groups.map((group) => ({
                    label: group.name,
                    value: group.id,
                  }))}
                  onSelect={setSelectedGroup}
                />
              </View>
            ) : (
              <View style={{ marginBottom: 18 }}>
                {isLoadingData ? (
                  <ActivityIndicator
                    color={COLORS.primary}
                    size="small"
                    style={{ marginVertical: 10 }}
                  />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {friends.map((friend) => (
                      <TouchableOpacity
                        key={friend.id}
                        onPress={() => toggleFriend(friend.id)}
                        activeOpacity={0.8}
                        style={{
                          alignItems: 'center',
                          marginRight: 16,
                          opacity: friend.selected ? 1 : 0.4,
                        }}
                      >
                        <View>
                          <Image
                            source={{ uri: friend.avatar }}
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 25,
                              marginBottom: 6,
                              borderWidth: friend.selected ? 2 : 0,
                              borderColor: COLORS.select,
                            }}
                          />

                          {friend.selected && (
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
                                borderColor: '#ffffff',
                              }}
                            >
                              <X
                                color="#ffffff"
                                size={10}
                                strokeWidth={3}
                              />
                            </View>
                          )}
                        </View>

                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: COLORS.textSecondary,
                          }}
                        >
                          {friend.name}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      onPress={handleAddFriend}
                      activeOpacity={0.85}
                      style={{ alignItems: 'center' }}
                    >
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
                          marginBottom: 6,
                        }}
                      >
                        <Plus
                          color={COLORS.select}
                          size={20}
                          strokeWidth={2.5}
                        />
                      </View>

                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: COLORS.select,
                        }}
                      >
                        เพิ่มเพื่อน
                      </Text>
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
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              marginBottom: 12,
            }}
          >
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
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              marginBottom: 12,
            }}
          >
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
          <FieldInput
            value={topic}
            onChangeText={setTopic}
            placeholder="หัวข้อ"
          />
        )}

        {category === 'work' &&
          !isSolo &&
          meetingMode === 'online' && (
            <FieldInput
              value={meetingLink}
              onChangeText={setMeetingLink}
              placeholder="ลิงก์ประชุม"
              icon={<Link2 color={COLORS.textMuted} size={16} />}
            />
          )}

        {(category !== 'work' ||
          isSolo ||
          meetingMode === 'inperson') && (
            <PlaceAutocomplete
              apiKey={GOOGLE_PLACES_API_KEY}
              value={location}
              onChangeText={(text) => {
                setLocation(text);
                setSelectedPlace(null);
              }}
              onSelect={(place) => {
                setLocation(place.name);
                setSelectedPlace(place);
              }}
            />
          )}

        {category === 'food' && !isSolo && (
          <FieldInput
            value={budget}
            onChangeText={setBudget}
            placeholder="งบประมาณคร่าว ๆ (ไม่บังคับ)"
          />
        )}

        {category === 'trip' && !isSolo && (
          <>
            <FieldInput
              value={budget}
              onChangeText={setBudget}
              placeholder="งบประมาณคร่าว ๆ (ไม่บังคับ)"
            />

            {tripType === 'multi' && (
              <FieldInput
                value={accommodation}
                onChangeText={setAccommodation}
                placeholder="ที่พัก / โรงแรม (ถ้ามี)"
              />
            )}
          </>
        )}

        <View style={{ marginBottom: 6 }} />

        {/* 4. วันที่และเวลานัดหมาย */}
        <SectionLabel number={nextSection()}>
          วันที่และเวลานัดหมาย
        </SectionLabel>

        {!isSolo && (
          <CheckboxRow
            checked={appDecide}
            onToggle={() => setAppDecide((value) => !value)}
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

            <FieldInput
              value={notes}
              onChangeText={setNotes}
              placeholder="หมายเหตุ / สิ่งที่ต้องเตรียมไป"
            />

            <SelectField
              icon={<Repeat color={COLORS.textMuted} size={16} />}
              value={recurring}
              placeholder="ทำประจำ"
              options={RECURRING_OPTIONS.map((option) => ({
                label: option,
                value: option,
              }))}
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

            <FieldInput
              value={duration}
              onChangeText={setDuration}
              placeholder="ระยะเวลา (เช่น 3 วัน 2 คืน)"
            />

            <FieldInput
              value={notes}
              onChangeText={setNotes}
              placeholder="หมายเหตุ / สิ่งที่ต้องเตรียมไป"
            />
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

            <FieldInput
              value={notes}
              onChangeText={setNotes}
              placeholder="หมายเหตุ / สิ่งที่ต้องเตรียมไป"
            />
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

        {/* 5. หัวข้อโหวต */}
        {!isSolo && voteEnabled && (
          <View
            style={{
              backgroundColor: COLORS.primarySoft,
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: COLORS.textPrimary,
              }}
            >
              หัวข้อโหวต
            </Text>

            {polls.map((poll, pollIndex) => (
              <View
                key={poll.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 12,
                }}
              >
                <TextInput
                  value={poll.title}
                  onChangeText={(value) =>
                    updatePoll(poll.id, { title: value })
                  }
                  placeholder={`หัวข้อที่ ${pollIndex + 1}`}
                  placeholderTextColor={COLORS.textMuted}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 10,
                    color: COLORS.textPrimary,
                  }}
                />

                {poll.options.map((option, optionIndex) => {
                  const optionDate = parseDateKey(option.date);

                  return (
                    <View
                      key={option.id}
                      style={{
                        marginTop: 12,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <TextInput
                          value={option.label}
                          onChangeText={(value) =>
                            updatePollOption(
                              poll.id,
                              option.id,
                              value,
                            )
                          }
                          placeholder={`ชื่อตัวเลือก ${optionIndex + 1}`}
                          placeholderTextColor={COLORS.textMuted}
                          style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            borderRadius: 8,
                            padding: 10,
                            color: COLORS.textPrimary,
                          }}
                        />

                        <TouchableOpacity
                          onPress={() =>
                            removePollOption(poll.id, option.id)
                          }
                          hitSlop={{
                            top: 8,
                            bottom: 8,
                            left: 8,
                            right: 8,
                          }}
                        >
                          <X color={COLORS.danger} size={20} />
                        </TouchableOpacity>
                      </View>

                      {/* วันที่ของตัวเลือกโหวต */}
                      <DatePickerButton
                        icon={
                          <Calendar
                            color={COLORS.textMuted}
                            size={16}
                          />
                        }
                        value={
                          optionDate
                            ? formatDateThai(optionDate)
                            : ''
                        }
                        placeholder="เลือกวันที่"
                        onPress={() =>
                          openPollPicker(
                            poll.id,
                            option.id,
                            'date',
                          )
                        }
                      />

                      {/* เวลาเริ่มและเวลาสิ้นสุด */}
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <DatePickerButton
                            icon={
                              <Clock
                                color={COLORS.textMuted}
                                size={16}
                              />
                            }
                            value={option.startTime ?? ''}
                            placeholder="เวลาเริ่ม"
                            onPress={() =>
                              openPollPicker(
                                poll.id,
                                option.id,
                                'startTime',
                              )
                            }
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <DatePickerButton
                            icon={
                              <Clock
                                color={COLORS.textMuted}
                                size={16}
                              />
                            }
                            value={option.endTime ?? ''}
                            placeholder="เวลาสิ้นสุด"
                            onPress={() =>
                              openPollPicker(
                                poll.id,
                                option.id,
                                'endTime',
                              )
                            }
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}

                <TouchableOpacity
                  onPress={() =>
                    addPollOption(poll.id, {
                      id: `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 8)}`,
                      label: '',
                      date: '',
                      startTime: '',
                      endTime: '',
                    })
                  }
                  style={{ paddingVertical: 12 }}
                >
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontWeight: '700',
                    }}
                  >
                    ＋ เพิ่มตัวเลือก
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => removePoll(poll.id)}
                  style={{ paddingVertical: 8 }}
                >
                  <Text style={{ color: COLORS.danger }}>
                    ลบหัวข้อนี้
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => addPoll('date')}
              style={{
                padding: 14,
                alignItems: 'center',
                marginTop: 8,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: COLORS.primary,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: COLORS.primary,
                  fontWeight: '700',
                }}
              >
                ＋ เพิ่มหัวข้อโหวต
              </Text>
            </TouchableOpacity>
          </View>
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
            elevation: 4,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              {isSolo ? (
                <Check
                  color="#ffffff"
                  size={16}
                  style={{ marginRight: 8 }}
                />
              ) : (
                <Send
                  color="#ffffff"
                  size={16}
                  style={{ marginRight: 8 }}
                />
              )}

              <Text
                style={{
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: 15,
                  letterSpacing: 0.2,
                }}
              >
                {isSolo ? 'สร้าง' : 'ส่งคำเชิญนัดหมาย'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* DateTimePicker สำหรับ iOS และ Android */}
      {pickerTarget !== null && (
        <View
          style={
            Platform.OS === 'ios'
              ? {
                backgroundColor: '#ffffff',
                paddingBottom: insets.bottom + 10,
                borderTopWidth: 1,
                borderColor: COLORS.border,
              }
              : undefined
          }
        >
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={() => setPickerTarget(null)}
              style={{
                alignSelf: 'flex-end',
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 4,
              }}
            >
              <Text
                style={{
                  color: COLORS.primary,
                  fontWeight: '700',
                  fontSize: 15,
                }}
              >
                ตกลง
              </Text>
            </TouchableOpacity>
          )}

          <DateTimePicker
            value={getPickerValue()}
            mode={pickerMode}
            display="spinner"
            onChange={handlePickerChange}
            onDismiss={() => setPickerTarget(null)}
            is24Hour={true}
            locale="th-TH"
          />
        </View>
      )}
    </View>
  );
}