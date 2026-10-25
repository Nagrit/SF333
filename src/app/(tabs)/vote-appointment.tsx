
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/api';

type PollKind = 'general' | 'date' | 'time' | 'place' | 'activity';

interface VoteOption {
  id: string;
  label: string;
  startAt?: string | null;
  endAt?: string | null;
  location?: string | null;
  date?: string;
  time?: string;
  votes: string;
  progress: number;
  avatars: string[];
}

interface VotePoll {
  id: string;
  title: string;
  kind: PollKind;
  required: boolean;
  options: VoteOption[];
}

interface VoteAppointmentData {
  title: string;
  groupName: string;
  status?: string;
  isVote?: boolean;
  isOrganizer?: boolean;
  userSelectedIds: string[];
  polls: VotePoll[];
}

const POLL_KIND_LABELS: Record<PollKind, string> = {
  general: 'โหวตทั่วไป',
  date: 'เลือกวันนัดหมาย',
  time: 'เลือกเวลา',
  place: 'เลือกสถานที่',
  activity: 'เลือกกิจกรรม',
};

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback;
}

function toCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function formatDate(value?: string | null): string {
  if (!value) return '';

  // รองรับวันที่แบบ YYYY-MM-DD โดยไม่ให้วันที่คลาดเคลื่อนจาก timezone
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value?: string | null): string {
  if (!value) return '';

  // รองรับค่าเวลา HH:mm ที่ API ส่งมาโดยตรง
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [hour, minute] = value.split(':');
    return `${hour.padStart(2, '0')}:${minute}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function normalizeProgress(value: unknown): number {
  const progress = Number(value);

  if (!Number.isFinite(progress)) return 0;

  // รองรับทั้งสัดส่วน 0–1 และเปอร์เซ็นต์ 0–100
  const percent = progress <= 1 ? progress * 100 : progress;

  return Math.min(100, Math.max(0, percent));
}

function mapOption(option: any): VoteOption {
  const votesCount = toCount(
    option.votesCount ?? option.voteCount ?? option.totalVotes,
  );

  const avatars = Array.isArray(option.avatars)
    ? option.avatars.filter(
        (url: unknown): url is string =>
          typeof url === 'string' && url.length > 0,
      )
    : [];

  return {
    id: String(option.id),
    label: toText(
      option.label,
      toText(option.title, toText(option.name, 'ตัวเลือก')),
    ),
    startAt: option.startAt ?? null,
    endAt: option.endAt ?? null,
    location: option.location ?? null,
    date: toText(option.date, toText(option.dateText)),
    time: toText(option.time, toText(option.timeText)),
    votes: toText(option.votes, `${votesCount} คน`),
    progress: normalizeProgress(option.progress),
    avatars,
  };
}

function mapPoll(poll: any, index: number): VotePoll {
  const options = Array.isArray(poll.options)
    ? poll.options.map(mapOption)
    : [];

  const allowedKinds: PollKind[] = [
    'general',
    'date',
    'time',
    'place',
    'activity',
  ];

  const kind: PollKind = allowedKinds.includes(poll.kind)
    ? poll.kind
    : 'general';

  return {
    id: String(poll.id ?? `poll-${index + 1}`),
    title: toText(poll.title, `หัวข้อโหวต ${index + 1}`),
    kind,
    required: poll.required === true,
    options,
  };
}

function mapVoteResponse(res: any): VoteAppointmentData {
  let polls: VotePoll[] = [];

  if (Array.isArray(res.polls) && res.polls.length > 0) {
    // รูปแบบใหม่: appointment มีหลาย polls และแต่ละ poll มี options
    polls = res.polls.map(mapPoll);
  } else if (Array.isArray(res.options)) {
    // รองรับ API เดิมที่ส่ง options มาเป็นรายการเดียว
    polls = [
      {
        id: 'legacy-poll',
        title: 'เลือกวันและเวลาที่สะดวก',
        kind: 'date',
        required: true,
        options: res.options.map(mapOption),
      },
    ];
  }

  return {
    title: toText(res.title, 'นัดหมาย'),
    groupName: toText(res.groupName, toText(res.group, 'กลุ่มทั่วไป')),
    status: res.status,
    isVote: res.isVote,
    isOrganizer: res.isOrganizer === true,
    userSelectedIds: Array.isArray(res.userSelectedIds)
      ? res.userSelectedIds.map(String)
      : [],
    polls,
  };
}

function getOptionDetails(
  poll: VotePoll,
  option: VoteOption,
): string[] {
  const details: string[] = [];

  const startDate = option.startAt
    ? formatDate(option.startAt)
    : formatDate(option.date);

  const startTime = option.startAt
    ? formatTime(option.startAt)
    : '';

  const endTime = option.endAt
    ? formatTime(option.endAt)
    : '';

  if (poll.kind === 'date' || poll.kind === 'time') {
    if (startDate) details.push(startDate);

    if (startTime && endTime) {
      details.push(`${startTime}–${endTime} น.`);
    } else if (startTime) {
      details.push(`${startTime} น.`);
    } else if (option.time) {
      details.push(option.time);
    }
  }

  if (poll.kind === 'place' && option.location) {
    details.push(option.location);
  }

  // รองรับตัวเลือกเดิมที่มี date/time แต่ไม่มี startAt/endAt
  if (details.length === 0) {
    if (option.date) details.push(option.date);
    if (option.time) details.push(option.time);
  }

  return details;
}

export default function VoteAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const appointmentId = String(params.id ?? '');
  const insets = useSafeAreaInsets();

  const [voteData, setVoteData] =
    useState<VoteAppointmentData | null>(null);
  const [selectedOptions, setSelectedOptions] =
    useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVoteDetails = useCallback(
    async (isPullToRefresh = false) => {
      if (!appointmentId) {
        setIsLoading(false);
        Alert.alert('ไม่พบข้อมูล', 'ไม่พบรหัสนัดหมาย');
        return;
      }

      try {
        if (!isPullToRefresh) setIsLoading(true);

        const res = await apiFetch<any>(
          `/api/appointments/${appointmentId}/vote`,
        );

        if (res.status === 'confirmed' || res.isVote === false) {
          Alert.alert(
            'การโหวตสิ้นสุดแล้ว',
            'ผู้จัดได้สรุปวันนัดหมายเรียบร้อยแล้ว',
            [
              {
                text: 'ดูรายละเอียดนัดหมาย',
                onPress: () =>
                  router.replace({
                    pathname: '/appointment-detail',
                    params: { id: appointmentId },
                  }),
              },
            ],
          );

          setVoteData(null);
          return;
        }

        const mappedData = mapVoteResponse(res);

        setVoteData(mappedData);
        setSelectedOptions(mappedData.userSelectedIds);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'ไม่สามารถดึงข้อมูลการโหวตได้';

        Alert.alert('เกิดข้อผิดพลาด', message);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [appointmentId, router],
  );

  useEffect(() => {
    fetchVoteDetails();
  }, [fetchVoteDetails]);

  const toggleOption = (optionId: string) => {
    setSelectedOptions((previous) =>
      previous.includes(optionId)
        ? previous.filter((id) => id !== optionId)
        : [...previous, optionId],
    );
  };

  const handleSubmitVote = async () => {
    if (!voteData || isSubmitting) return;

    if (selectedOptions.length === 0) {
      Alert.alert(
        'แจ้งเตือน',
        'กรุณาเลือกอย่างน้อย 1 ตัวเลือกเพื่อโหวต',
      );
      return;
    }

    // ตรวจสอบเฉพาะโพลที่ API ระบุว่า required
    const missingRequiredPoll = voteData.polls.find(
      (poll) =>
        poll.required &&
        !poll.options.some((option) =>
          selectedOptions.includes(option.id),
        ),
    );

    if (missingRequiredPoll) {
      Alert.alert(
        'ยังเลือกไม่ครบ',
        `กรุณาเลือกอย่างน้อย 1 ตัวเลือกในหัวข้อ "${missingRequiredPoll.title}"`,
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await apiFetch(
        `/api/appointments/${appointmentId}/vote`,
        {
          method: 'POST',
          body: JSON.stringify({
            optionIds: selectedOptions,
          }),
        },
      );

      Alert.alert(
        'สำเร็จ',
        'ส่งผลโหวตของคุณแล้ว',
        [
          {
            text: 'ดูผลโหวต',
            onPress: () =>
              router.push({
                pathname: '/vote-result',
                params: { id: appointmentId },
              }),
          },
        ],
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'ไม่สามารถส่งผลโหวตได้';

      Alert.alert('เกิดข้อผิดพลาด', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#468f92" />
      </View>
    );
  }

  if (!voteData) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.emptyText}>ไม่พบข้อมูลการโหวต</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchVoteDetails()}
        >
          <Text style={styles.retryButtonText}>ลองอีกครั้ง</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.back()}
        >
          <Text style={styles.backLinkText}>กลับ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusBarHeight =
    Platform.OS === 'android'
      ? StatusBar.currentHeight ?? 24
      : 0;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#468f92"
        translucent={false}
      />

      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, statusBarHeight) + 8,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="กลับ"
        >
          <ArrowLeft color="#ffffff" size={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>โหวตการนัด 💻</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchVoteDetails(true);
            }}
            colors={['#468f92']}
          />
        }
      >
        <Text style={styles.titleText}>{voteData.title}</Text>
        <Text style={styles.subtitleText}>
          กลุ่ม: {voteData.groupName}
        </Text>
        <Text style={styles.instructionText}>
          เลือกตัวเลือกที่คุณสะดวกได้มากกว่า 1 ตัวเลือก
        </Text>

        {voteData.polls.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              ยังไม่มีตัวเลือกสำหรับการโหวต
            </Text>
          </View>
        ) : (
          voteData.polls.map((poll, pollIndex) => (
            <View key={poll.id} style={styles.pollSection}>
              <View style={styles.pollHeading}>
                <View style={styles.pollHeadingText}>
                  <Text style={styles.pollTitle}>
                    {pollIndex + 1}. {poll.title}
                  </Text>
                  <Text style={styles.pollKind}>
                    {POLL_KIND_LABELS[poll.kind]}
                    {poll.required ? ' · จำเป็นต้องเลือก' : ''}
                  </Text>
                </View>
              </View>

              {poll.options.map((option) => {
                const isSelected = selectedOptions.includes(option.id);
                const details = getOptionDetails(poll, option);
                const progress = option.progress;

                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => toggleOption(option.id)}
                    activeOpacity={0.85}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                  >
                    <View style={styles.optionHeader}>
                      <View style={styles.optionHeaderLeft}>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected,
                          ]}
                        >
                          {isSelected && (
                            <Check
                              color="#ffffff"
                              size={14}
                              strokeWidth={3}
                            />
                          )}
                        </View>

                        <Text
                          style={[
                            styles.optionTitle,
                            isSelected && styles.optionTitleSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>

                      <View style={styles.votesBadge}>
                        <Text style={styles.votesBadgeText}>
                          {option.votes}
                        </Text>
                      </View>
                    </View>

                    {details.map((detail, index) => (
                      <Text
                        key={`${option.id}-detail-${index}`}
                        style={
                          index === 0
                            ? styles.optionDate
                            : styles.optionTime
                        }
                      >
                        {detail}
                      </Text>
                    ))}

                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${progress}%` },
                        ]}
                      />
                    </View>

                    {option.avatars.length > 0 && (
                      <View style={styles.avatarsRow}>
                        <Text style={styles.avatarsLabel}>
                          ผู้ที่โหวต
                        </Text>

                        <View style={styles.avatarsList}>
                          {option.avatars.map((url, index) => (
                            <Image
                              key={`${option.id}-avatar-${index}`}
                              source={{ uri: url }}
                              style={[
                                styles.avatarImg,
                                {
                                  marginLeft: index === 0 ? 0 : -6,
                                },
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}

        <TouchableOpacity
          onPress={handleSubmitVote}
          disabled={isSubmitting || voteData.polls.length === 0}
          style={[
            styles.submitButton,
            (isSubmitting || voteData.polls.length === 0) &&
              styles.submitButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              ยืนยันการโหวต 🏆
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#cce1de',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#cce1de',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    backgroundColor: '#468f92',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: 14,
    paddingVertical: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  titleText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 12,
    color: '#4b5563',
  },
  instructionText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    marginBottom: 18,
  },
  pollSection: {
    marginBottom: 10,
  },
  pollHeading: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  pollHeadingText: {
    flex: 1,
  },
  pollTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  pollKind: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 3,
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: '#3caea3',
    backgroundColor: '#f7fcfb',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  optionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    marginTop: 1,
  },
  checkboxSelected: {
    backgroundColor: '#3caea3',
    borderColor: '#3caea3',
  },
  optionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  optionTitleSelected: {
    color: '#217371',
  },
  votesBadge: {
    backgroundColor: '#eef5f4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  votesBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#217371',
  },
  optionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 3,
    marginLeft: 29,
  },
  optionTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    marginLeft: 29,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 5,
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3caea3',
    borderRadius: 3,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarsLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  avatarsList: {
    flexDirection: 'row',
  },
  avatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#217371',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: '#217371',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  backLink: {
    padding: 12,
    marginTop: 4,
  },
  backLinkText: {
    color: '#217371',
    fontWeight: '600',
  },
});
