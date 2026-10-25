// server/src/routes/appointments.ts

import { and, eq, inArray, or } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { db } from '../db';
import {
  appointmentMembers,
  appointmentPollOptions,
  appointmentPolls,
  appointmentPollVotes,
  appointments,
  friendGroupMembers,
  friendGroups,
  groups,
  users,
  notifications,
  userPushTokens,
} from '../db/schema';
import { Expo } from 'expo-server-sdk';




async function notifyAppointmentMembers(
  fastify: FastifyInstance,
  appointmentId: string,
  actorId: string,
  title: string,
  message: string,
  type: string,
) {
  const expo = new Expo();

  const members = await db
    .select({ userId: appointmentMembers.userId })
    .from(appointmentMembers)
    .where(eq(appointmentMembers.appointmentId, appointmentId));

  const recipientIds = [
    ...new Set(
      members
        .map((member) => member.userId)
        .filter((memberId) => memberId !== actorId),
    ),
  ];

  fastify.log.info(
    {
      appointmentId,
      type,
      recipientCount: recipientIds.length,
    },
    '[Appointment Push] Recipients identified',
  );

  for (const recipientId of recipientIds) {
    try {
      await db.insert(notifications).values({
        userId: recipientId,
        title,
        message,
        type,
        data: JSON.stringify({ appointmentId }),
        isRead: false,
      });

      const tokens = await db
        .select({ token: userPushTokens.token })
        .from(userPushTokens)
        .where(
          and(
            eq(userPushTokens.userId, recipientId),
            eq(userPushTokens.enabled, true),
          ),
        );

      const validTokens = [
        ...new Set(
          tokens
            .map((item) => item.token)
            .filter((token) => Expo.isExpoPushToken(token)),
        ),
      ];

      fastify.log.info(
        {
          appointmentId,
          recipientId,
          tokenCount: tokens.length,
          validTokenCount: validTokens.length,
        },
        '[Appointment Push] Tokens checked',
      );

      if (validTokens.length === 0) {
        fastify.log.warn(
          { appointmentId, recipientId },
          '[Appointment Push] No valid enabled token',
        );
        continue;
      }

      for (const token of validTokens) {
        try {
          const tickets = await expo.sendPushNotificationsAsync([
            {
              to: token,
              sound: 'default',
              title,
              body: message,
              data: { type, appointmentId },
              channelId: 'default',
            },
          ]);

          for (const ticket of tickets) {
            if (ticket.status === 'ok') {
              fastify.log.info(
                {
                  appointmentId,
                  recipientId,
                  ticketId: ticket.id,
                  status: ticket.status,
                },
                '[Appointment Push] Expo accepted message',
              );
            } else {
              fastify.log.error(
                {
                  appointmentId,
                  recipientId,
                  status: ticket.status,
                  message: ticket.message,
                  details: ticket.details,
                },
                '[Appointment Push] Expo returned an error ticket',
              );
            }
          }
        } catch (error) {
          fastify.log.error(
            { error, appointmentId, recipientId },
            '[Appointment Push] Sending failed',
          );
        }
      }
    } catch (error) {
      fastify.log.error(
        { error, appointmentId, recipientId },
        '[Appointment Push] Notification processing failed',
      );
    }
  }
}



function parseToDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  if (typeof val === 'string') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;

    const timeMatch = val.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const now = new Date();
      now.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
      return now;
    }
  }
  return null;
}

function toDateKey(value: unknown): string {
  if (!value) return '';

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatToIsoDateStr(val: unknown): string | null {
  if (!val) return null;

  // วันที่แบบ YYYY-MM-DD ไม่ต้องแปลง timezone
  if (typeof val === 'string') {
    const text = val.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [year, month, day] = text.split('-').map(Number);
      const check = new Date(Date.UTC(year, month - 1, day));

      if (
        check.getUTCFullYear() === year &&
        check.getUTCMonth() === month - 1 &&
        check.getUTCDate() === day
      ) {
        return text;
      }

      return null;
    }

    // รองรับข้อความวันที่ภาษาไทยรูปแบบเดิม เช่น 24 ต.ค. 2569
    const thaiMonths: Record<string, string> = {
      'ม.ค.': '01',
      'ก.พ.': '02',
      'มี.ค.': '03',
      'เม.ย.': '04',
      'พ.ค.': '05',
      'มิ.ย.': '06',
      'ก.ค.': '07',
      'ส.ค.': '08',
      'ก.ย.': '09',
      'ต.ค.': '10',
      'พ.ย.': '11',
      'ธ.ค.': '12',
    };

    const parts = text.split(/\s+/);
    if (parts.length === 3 && thaiMonths[parts[1]]) {
      const day = Number(parts[0]);
      let year = Number(parts[2]);

      // รองรับทั้ง พ.ศ. และ ค.ศ.
      if (year >= 2400) year -= 543;

      const month = Number(thaiMonths[parts[1]]);
      const check = new Date(Date.UTC(year, month - 1, day));

      if (
        check.getUTCFullYear() === year &&
        check.getUTCMonth() === month - 1 &&
        check.getUTCDate() === day
      ) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    return null;
  }

  // รองรับ Date object โดยอ่านวันที่ตาม local fields
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  return null;
}

function combineDateAndTime(
  dateValue: unknown,
  timeValue: unknown,
): Date | null {
  const dateKey = formatToIsoDateStr(dateValue);

  if (!dateKey || typeof timeValue !== 'string') {
    return null;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue);

  if (!match) return null;

  // สร้างเวลาที่ระบุเป็นเวลาไทย UTC+7 อย่างชัดเจน
  const result = new Date(`${dateKey}T${timeValue}:00+07:00`);

  return Number.isNaN(result.getTime()) ? null : result;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

// ✅ จุดที่แก้ 1: ป้องกัน userId เป็น undefined หรือว่างเปล่า
function extractUserId(request: any): string | null {
  const u = request.user;
  if (!u) return null;
  const id = u.userId || u.id || u.sub;
  return typeof id === 'string' && id.trim() !== '' ? id : null;
}

// ✅ จุดที่แก้ 2: ดึงทั้งกลุ่มที่เป็นสมาชิกและกลุ่มที่เป็นเจ้าของ (ownerId)
async function getUserGroupIds(userId: string): Promise<string[]> {
  const memberGroupRows = await db
    .select({ groupId: friendGroupMembers.groupId })
    .from(friendGroupMembers)
    .where(eq(friendGroupMembers.userId, userId));

  const ownedGroupRows = await db
    .select({ groupId: friendGroups.id })
    .from(friendGroups)
    .where(eq(friendGroups.ownerId, userId));

  const allIds = [
    ...memberGroupRows.map((g) => g.groupId),
    ...ownedGroupRows.map((g) => g.groupId),
  ].filter((id): id is string => Boolean(id));

  return Array.from(new Set(allIds));
}

async function getAppointmentForOwner(
  appointmentId: string,
  userId: string,
) {
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointment || appointment.creatorId !== userId) {
    return null;
  }

  return appointment;
}


export async function appointmentRoutes(fastify: FastifyInstance) {
  // 1. GET /api/appointments/pending
  fastify.get('/pending', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const userId = extractUserId(request);

      if (!userId) {
        return reply.status(401).send({ message: 'Unauthorized: Missing User ID' });
      }

      const groupIds = await getUserGroupIds(userId);

      const conditions = [eq(appointments.creatorId, userId)];
      if (groupIds.length > 0) {
        conditions.push(inArray(appointments.groupId, groupIds));
      }

      const pendingAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.status, 'pending'),
            or(...conditions)
          )
        );

      const formatted = await Promise.all(
        pendingAppointments.map(async (item) => {
          let groupName = 'กลุ่มทั่วไป';

          if (item.groupId) {
            const [groupData] = await db
              .select()
              .from(groups)
              .where(eq(groups.id, item.groupId))
              .limit(1);

            if (groupData) {
              groupName = groupData.name;
            }
          }

          return {
            id: item.id,
            category:
              item.category === 'trip'
                ? 'เที่ยว'
                : item.category === 'work'
                  ? 'งาน'
                  : 'กินข้าว',
            title: item.title,
            groupName,
          };
        })
      );

      return formatted;
    } catch (err) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
  });


  // 2. GET /api/appointments
  fastify.get('/', async (request: any, reply) => {
    try {
      await request.jwtVerify();

      const userId = extractUserId(request);

      if (!userId) {
        return reply.status(401).send({
          message: 'Unauthorized: Missing User ID',
        });
      }

      const groupIds = await getUserGroupIds(userId);

      // ดึงนัดหมายที่ผู้ใช้สร้างเอง
      const conditions = [eq(appointments.creatorId, userId)];

      // ดึงนัดหมายที่มาจากกลุ่มของผู้ใช้
      if (groupIds.length > 0) {
        conditions.push(inArray(appointments.groupId, groupIds));
      }

      const ownedOrGroupAppointments = await db
        .select()
        .from(appointments)
        .where(or(...conditions));

      // ดึง ID ของนัดหมายที่ผู้ใช้เป็นสมาชิกหรือได้รับเชิญ
      const memberRows = await db
        .select({
          appointmentId: appointmentMembers.appointmentId,
        })
        .from(appointmentMembers)
        .where(eq(appointmentMembers.userId, userId));

      const memberAppointmentIds = [
        ...new Set(memberRows.map((row) => row.appointmentId)),
      ];

      // ดึงรายละเอียดนัดหมายที่ได้รับเชิญ
      const invitedAppointments =
        memberAppointmentIds.length > 0
          ? await db
            .select()
            .from(appointments)
            .where(inArray(appointments.id, memberAppointmentIds))
          : [];

      // รวมรายการทั้งหมดและป้องกันนัดหมายซ้ำ
      const appointmentMap = new Map();

      for (const item of [
        ...ownedOrGroupAppointments,
        ...invitedAppointments,
      ]) {
        appointmentMap.set(item.id, item);
      }

      const myAppointments = Array.from(appointmentMap.values());

      const formatted = myAppointments.map((item) => {
        const isConfirmed = item.status === 'confirmed';

        return {
          id: item.id,
          status: item.status,
          category: item.category,
          categoryKey: item.category,
          date: toDateKey(item.startDate),
          startAt: item.startAt
            ? new Date(item.startAt).toISOString()
            : null,
          endAt: item.endAt
            ? new Date(item.endAt).toISOString()
            : null,
          time: item.startAt
            ? new Date(item.startAt).toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Bangkok',
            })
            : '00:00',
          title: item.title,
          location: item.location || 'ไม่ระบุสถานที่',
          statusText:
            item.statusText ||
            (isConfirmed ? 'ยืนยันการนัดแล้ว' : 'รอยืนยันวันเวลา'),
          avatars: [],
        };
      });

      return reply.send(formatted);
    } catch (err) {
      request.log.error(err, 'Failed to fetch appointments');

      return reply.status(500).send({
        message: 'ไม่สามารถโหลดรายการนัดหมายได้',
      });
    }
  });


  // 3. GET /api/appointments/:id
  fastify.get('/:id', async (request: any, reply) => {
    function formatDateKeyThai(value: unknown): string | undefined {
      if (!value) return undefined;

      const key = String(value).slice(0, 10);
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);

      if (!match) return undefined;

      const [, year, month, day] = match;

      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        12,
        0,
        0,
      );

      return date.toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Bangkok',
      });
    }
    try {
      await request.jwtVerify();

      const { id: appointmentId } = request.params as { id: string };
      const userId = extractUserId(request);

      if (!userId) {
        return reply.status(401).send({
          message: 'กรุณาเข้าสู่ระบบใหม่',
        });
      }

      // 1. ดึงข้อมูลนัดหมาย
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);

      if (!appointment) {
        return reply.status(404).send({
          message: 'ไม่พบนัดหมายนี้',
        });
      }
      const [organizer] = await db
        .select({
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, appointment.creatorId))
        .limit(1);

      // 2. ดึงสมาชิกและข้อมูลผู้ใช้ของนัดหมาย
      const memberRows = await db
        .select({
          userId: appointmentMembers.userId,
          status: appointmentMembers.status,
          name: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(appointmentMembers)
        .leftJoin(users, eq(appointmentMembers.userId, users.id))
        .where(eq(appointmentMembers.appointmentId, appointmentId));

      const members = memberRows.map((member) => {
        const status = String(member.status || 'pending').toLowerCase();

        let statusText = 'รอยืนยัน';

        if (['accepted', 'confirmed', 'accept'].includes(status)) {
          statusText = 'เข้าร่วม';
        } else if (['declined', 'rejected', 'reject'].includes(status)) {
          statusText = 'ไม่สะดวก';
        } else if (status === 'voted') {
          statusText = 'โหวตแล้ว';
        }

        return {
          id: member.userId,
          userId: member.userId,
          name: member.name || 'สมาชิก',
          avatar: member.avatarUrl || '',
          avatarUrl: member.avatarUrl || '',
          status,
          statusText,
        };
      });

      // 3. ดึงคำตอบของผู้ใช้ที่กำลังล็อกอิน
      const currentMembership = memberRows.find(
        (member) => member.userId === userId
      );

      const currentStatus = String(
        currentMembership?.status || ''
      ).toLowerCase();

      const userResponse =
        ['accepted', 'confirmed', 'accept'].includes(currentStatus)
          ? 'accept'
          : ['declined', 'rejected', 'reject'].includes(currentStatus)
            ? 'reject'
            : null;

      // 4. ส่งข้อมูลกลับไปยังแอป
      return reply.send({
        appointment: {
          ...appointment,
          isOrganizer: appointment.creatorId === userId,
          organizerName: organizer?.displayName || 'ผู้จัดงาน',
          organizerAvatar: organizer?.avatarUrl || '',
          dateText: formatDateKeyThai(appointment.startDate),
          timeText: appointment.startAt
            ? new Date(appointment.startAt).toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Bangkok',
            }) + ' น.'
            : undefined,
          members,
          userResponse,
        },
      });
    } catch (err: any) {
      request.log.error({ err }, 'Failed to get appointment detail');

      if (err?.statusCode === 401) {
        return reply.status(401).send({
          message: 'กรุณาเข้าสู่ระบบใหม่',
        });
      }

      return reply.status(500).send({
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลนัดหมาย',
      });
    }
  });


  // 4. GET /api/appointments/:id/vote

  fastify.get('/:id/vote', async (request: any, reply) => {
    try {
      await request.jwtVerify();

      const userId = extractUserId(request);
      const { id } = request.params as { id: string };

      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!appointment) {
        return reply.status(404).send({
          message: 'ไม่พบนัดหมายนี้',
        });
      }

      let groupName = 'กลุ่มทั่วไป';

      if (appointment.groupId) {
        const [groupData] = await db
          .select()
          .from(groups)
          .where(eq(groups.id, appointment.groupId))
          .limit(1);

        if (groupData) {
          groupName = groupData.name;
        }
      }

      // 1. ดึงหัวข้อโหวตทั้งหมดของนัดหมาย
      const pollRows = await db
        .select()
        .from(appointmentPolls)
        .where(eq(appointmentPolls.appointmentId, id));

      const pollIds = pollRows.map((poll) => poll.id);

      // กรณีไม่มีหัวข้อโหวต
      if (pollIds.length === 0) {
        return reply.send({
          appointmentId: appointment.id,
          title: appointment.title,
          groupName,
          isOrganizer: appointment.creatorId === userId,
          isVote: appointment.isVote,
          status: appointment.status,
          userSelectedIds: [],
          polls: [],
          options: [],
        });
      }

      // 2. ดึงตัวเลือกทั้งหมดในทุกหัวข้อ
      const optionRows = await db
        .select()
        .from(appointmentPollOptions)
        .where(inArray(appointmentPollOptions.pollId, pollIds));

      const optionIds = optionRows.map((option) => option.id);

      // 3. ดึงคะแนนและข้อมูลผู้โหวต
      const voteRows = optionIds.length > 0
        ? await db
          .select({
            optionId: appointmentPollVotes.optionId,
            userId: appointmentPollVotes.userId,
            avatarUrl: users.avatarUrl,
          })
          .from(appointmentPollVotes)
          .leftJoin(
            users,
            eq(appointmentPollVotes.userId, users.id),
          )
          .where(inArray(appointmentPollVotes.optionId, optionIds))
        : [];

      // 4. จัดกลุ่มคะแนนตาม optionId
      const votesByOption = new Map<
        string,
        { userId: string; avatarUrl: string | null }[]
      >();

      for (const vote of voteRows) {
        const existing = votesByOption.get(vote.optionId) ?? [];

        existing.push({
          userId: vote.userId,
          avatarUrl: vote.avatarUrl,
        });

        votesByOption.set(vote.optionId, existing);
      }

      // 5. สร้าง response โดยรักษาความสัมพันธ์ poll -> options
      const polls = pollRows.map((poll) => {
        const options = optionRows
          .filter((option) => option.pollId === poll.id)
          .map((option) => {
            const votes = votesByOption.get(option.id) ?? [];

            return {
              id: option.id,
              label: option.label,
              title: option.label,

              // ส่ง ISO timestamp เพื่อให้ frontend แปลงวันที่และเวลาได้
              startAt: option.startAt?.toISOString() ?? null,
              endAt: option.endAt?.toISOString() ?? null,

              location: option.location,
              placeId: option.placeId,

              votesCount: votes.length,
              votes: `${votes.length} คน`,

              // คำนวณ progress ภายหลังในแต่ละ poll
              progress: 0,

              // ตัดรายการ avatar ซ้ำ และไม่ส่ง URL ว่าง
              avatars: [
                ...new Set(
                  votes
                    .map((vote) => vote.avatarUrl)
                    .filter(
                      (url): url is string =>
                        typeof url === 'string' && url.length > 0,
                    ),
                ),
              ],
            };
          });

        const maxVotes = Math.max(
          0,
          ...options.map((option) => option.votesCount),
        );

        return {
          id: poll.id,
          title: poll.title,
          kind: poll.kind,

          // schema ปัจจุบันยังไม่มีคอลัมน์ required
          required: false,

          options: options.map((option) => ({
            ...option,
            progress:
              maxVotes > 0
                ? option.votesCount / maxVotes
                : 0,
          })),
        };
      });

      // 6. ตัวเลือกที่ผู้ใช้คนนี้เคยโหวต
      const userSelectedIds = voteRows
        .filter((vote) => vote.userId === userId)
        .map((vote) => vote.optionId);

      return reply.send({
        appointmentId: appointment.id,
        title: appointment.title,
        groupName,
        isOrganizer: appointment.creatorId === userId,
        isVote: appointment.isVote,
        status: appointment.status,
        userSelectedIds,
        polls,
      });
    } catch (err) {
      request.log?.error(err);

      return reply.status(500).send({
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโหวต',
      });
    }
  });



  // 5. POST /api/appointments/:id/vote

  fastify.post('/:id/vote', async (request: any, reply) => {
    const { id } = request.params as { id: string };

    // 1. ตรวจสอบ JWT แยกจากการทำงานของ endpoint
    try {
      await request.jwtVerify();
    } catch (err: any) {
      request.log.warn(
        {
          code: err?.code,
          message: err?.message,
        },
        'Vote endpoint: JWT verification failed',
      );

      return reply.status(401).send({
        message: 'เซสชันหมดอายุหรือยืนยันตัวตนไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่',
        code: err?.code ?? 'JWT_VERIFICATION_FAILED',
      });
    }

    try {
      const { optionIds } = (request.body as {
        optionIds?: unknown;
      }) ?? {};

      // 2. ตรวจสอบ ID ผู้ใช้จาก JWT
      const userId = extractUserId(request);

      if (!userId) {
        request.log.warn(
          {
            user: request.user,
            keys: Object.keys(request.user ?? {}),
          },
          'Vote endpoint: user ID missing from JWT',
        );

        return reply.status(401).send({
          message: 'ไม่พบรหัสผู้ใช้ใน Token กรุณาเข้าสู่ระบบใหม่',
          code: 'USER_ID_MISSING',
        });
      }

      if (!userId) {
        request.log.warn('Vote endpoint: user ID missing from JWT');

        return reply.status(401).send({
          message: 'ไม่พบรหัสผู้ใช้ใน Token กรุณาเข้าสู่ระบบใหม่',
          code: 'USER_ID_MISSING',
        });
      }

      // 3. ตรวจสอบรูปแบบ optionIds
      if (
        !Array.isArray(optionIds) ||
        !optionIds.every(
          (optionId) =>
            typeof optionId === 'string' &&
            optionId.trim().length > 0,
        )
      ) {
        return reply.status(400).send({
          message: 'กรุณาส่งรายการตัวเลือกที่ต้องการโหวตให้ถูกต้อง',
        });
      }

      const uniqueOptionIds = [...new Set(optionIds as string[])];

      // 4. ตรวจสอบว่านัดหมายมีอยู่จริง
      const [appointment] = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!appointment) {
        return reply.status(404).send({
          message: 'ไม่พบนัดหมายนี้',
        });
      }

      // 5. ตรวจสอบ Poll และ Option ทั้งหมดของนัดหมาย
      const polls = await db
        .select({ id: appointmentPolls.id })
        .from(appointmentPolls)
        .where(eq(appointmentPolls.appointmentId, id));

      const pollIds = polls.map((poll) => poll.id);

      let appointmentOptionIds: string[] = [];

      if (pollIds.length > 0) {
        const options = await db
          .select({ id: appointmentPollOptions.id })
          .from(appointmentPollOptions)
          .where(inArray(appointmentPollOptions.pollId, pollIds));

        appointmentOptionIds = options.map((option) => option.id);
      }

      // ป้องกันการส่ง ID ตัวเลือกจากนัดหมายอื่น
      const validOptionIdSet = new Set(appointmentOptionIds);

      if (
        uniqueOptionIds.some(
          (optionId) => !validOptionIdSet.has(optionId),
        )
      ) {
        return reply.status(400).send({
          message: 'พบตัวเลือกที่ไม่ถูกต้องหรือไม่อยู่ในนัดหมายนี้',
        });
      }

      // 6. บันทึกโหวตใหม่ หรือลบโหวตเมื่อส่ง []
      await db.transaction(async (tx) => {
        if (appointmentOptionIds.length > 0) {
          await tx
            .delete(appointmentPollVotes)
            .where(
              and(
                eq(appointmentPollVotes.userId, userId),
                inArray(
                  appointmentPollVotes.optionId,
                  appointmentOptionIds,
                ),
              ),
            );
        }

        if (uniqueOptionIds.length > 0) {
          await tx.insert(appointmentPollVotes).values(
            uniqueOptionIds.map((optionId) => ({
              optionId,
              userId,
            })),
          );
        }
      });

      return reply.send({
        message:
          uniqueOptionIds.length > 0
            ? 'บันทึกการโหวตเรียบร้อยแล้ว'
            : 'ยกเลิกการโหวตเรียบร้อยแล้ว',
        appointmentId: id,
        optionIds: uniqueOptionIds,
      });
    } catch (err: any) {
      request.log.error(
        {
          name: err?.name,
          code: err?.code,
          message: err?.message,
        },
        'Vote endpoint: failed to process vote',
      );

      return reply.status(500).send({
        message: 'ไม่สามารถส่งผลโหวตได้',
      });
    }
  });


  // 6. GET /api/appointments/:id/vote-result

  // GET /api/appointments/:id/vote-result
  fastify.get('/:id/vote-result', async (request: any, reply) => {
    try {
      await request.jwtVerify();

      const userId = extractUserId(request);
      const { id } = request.params as { id: string };

      if (!userId) {
        return reply.status(401).send({
          message: 'ไม่พบรหัสผู้ใช้ใน Token',
        });
      }

      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!appointment) {
        return reply.status(404).send({
          message: 'ไม่พบนัดหมายนี้',
        });
      }

      let groupName = 'กลุ่มทั่วไป';

      if (appointment.groupId) {
        const [groupData] = await db
          .select()
          .from(groups)
          .where(eq(groups.id, appointment.groupId))
          .limit(1);

        if (groupData) groupName = groupData.name;
      }

      const pollRows = await db
        .select()
        .from(appointmentPolls)
        .where(eq(appointmentPolls.appointmentId, id));

      const pollIds = pollRows.map((poll) => poll.id);

      const optionRows = pollIds.length
        ? await db
          .select()
          .from(appointmentPollOptions)
          .where(inArray(appointmentPollOptions.pollId, pollIds))
        : [];

      const optionIds = optionRows.map((option) => option.id);

      const voteRows = optionIds.length
        ? await db
          .select({
            optionId: appointmentPollVotes.optionId,
            userId: appointmentPollVotes.userId,
            avatarUrl: users.avatarUrl,
          })
          .from(appointmentPollVotes)
          .leftJoin(
            users,
            eq(appointmentPollVotes.userId, users.id),
          )
          .where(inArray(appointmentPollVotes.optionId, optionIds))
        : [];

      const memberRows = await db
        .select({ userId: appointmentMembers.userId })
        .from(appointmentMembers)
        .where(eq(appointmentMembers.appointmentId, id));

      const totalMembers = new Set(
        memberRows.map((member) => member.userId),
      ).size;

      const resultsByPoll = pollRows.map((poll) => {
        const pollOptions = optionRows
          .filter((option) => option.pollId === poll.id)
          .map((option) => {
            const votes = voteRows.filter(
              (vote) => vote.optionId === option.id,
            );

            const startAt = option.startAt
              ? new Date(option.startAt)
              : null;

            const validStartAt =
              startAt && !Number.isNaN(startAt.getTime())
                ? startAt
                : null;

            const startDate = validStartAt
              ? [
                validStartAt.getFullYear(),
                String(validStartAt.getMonth() + 1).padStart(2, '0'),
                String(validStartAt.getDate()).padStart(2, '0'),
              ].join('-')
              : null;

            const startTime = validStartAt
              ? [
                String(validStartAt.getHours()).padStart(2, '0'),
                String(validStartAt.getMinutes()).padStart(2, '0'),
              ].join(':')
              : null;

            return {
              id: option.id,
              title: option.label,
              label: option.label,
              startDate,
              startTime,
              location: option.location,
              votesCount: votes.length,
              totalMembers,
              avatars: [
                ...new Set(
                  votes
                    .map((vote) => vote.avatarUrl)
                    .filter(
                      (url): url is string =>
                        typeof url === 'string' && url.length > 0,
                    ),
                ),
              ],
            };
          })
          .sort((a, b) => b.votesCount - a.votesCount);

        const maxVotes = Math.max(
          0,
          ...pollOptions.map((option) => option.votesCount),
        );

        return {
          id: poll.id,
          title: poll.title,
          kind: poll.kind,
          options: pollOptions.map((option, index) => ({
            ...option,
            rank: `อันดับ ${index + 1}`,
            rankBg: index === 0 ? '#eef5f4' : '#f3f4f6',
            rankColor: index === 0 ? '#217371' : '#6b7280',
            status: `โหวต ${option.votesCount}/${totalMembers} คน`,
            statusColor: index === 0 ? '#217371' : '#e08955',
            progress:
              totalMembers > 0
                ? Number(
                  Math.min(
                    option.votesCount / totalMembers,
                    1,
                  ).toFixed(2),
                )
                : 0,
            isWinner:
              maxVotes > 0 &&
              option.votesCount === maxVotes,
          })),
        };
      });

      // รูปแบบ results สำหรับหน้าเดิม
      const results = resultsByPoll.flatMap((poll) =>
        poll.options.map((option) => ({
          ...option,
          pollTitle: poll.title,
          pollKind: poll.kind,
        })),
      );

      return reply.send({
        appointmentId: appointment.id,
        title: appointment.title,
        group: groupName,
        totalMembers,
        polls: resultsByPoll,
        results,
      });
    } catch (err) {
      request.log.error(err, 'Error fetching vote results');

      return reply.status(500).send({
        message: 'เกิดข้อผิดพลาดในการดึงสรุปผลโหวต',
      });
    }
  });




  fastify.post('/:id/confirm', async (request: any, reply) => {
    try {
      await request.jwtVerify();

      const userId = extractUserId(request);

      if (!userId) {
        return reply.status(401).send({
          message: 'Unauthorized',
        });
      }

      const { id } = request.params as { id: string };
      const { startDate, startTime } = (request.body as any) || {};

      // ตรวจสอบว่านัดหมายมีอยู่และผู้ใช้มีสิทธิ์ยืนยัน
      const appointment = await getAppointmentForOwner(id, userId);

      if (!appointment) {
        return reply.status(404).send({
          message: 'ไม่พบนัดหมายนี้',
        });
      }

      // ตรวจสอบวันที่
      const dateKey = formatToIsoDateStr(startDate);

      if (!dateKey) {
        return reply.status(400).send({
          message: 'กรุณาระบุวันที่นัดหมายให้ถูกต้อง',
        });
      }

      // ตรวจสอบเวลา
      const startAt = combineDateAndTime(dateKey, startTime);

      if (!startAt) {
        return reply.status(400).send({
          message: 'กรุณาระบุเวลาเริ่มต้นให้ถูกต้องในรูปแบบ HH:mm',
        });
      }

      // บันทึกการยืนยันนัดหมาย
      const [updatedAppointment] = await db
        .update(appointments)
        .set({
          startDate: dateKey,
          startAt,
          isVote: false,
          status: 'confirmed',
          statusText: 'ยืนยันแล้ว',
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, id))
        .returning();

      if (!updatedAppointment) {
        return reply.status(500).send({
          message: 'ไม่สามารถบันทึกการยืนยันนัดหมายได้',
        });
      }

      // แจ้งเตือนสมาชิกทันทีหลังยืนยันสำเร็จ
      if (updatedAppointment.notifyEnabled) {
        try {
          await notifyAppointmentMembers(
            fastify,
            updatedAppointment.id,
            userId,
            'ยืนยันวันนัดหมายแล้ว',
            `นัดหมาย "${updatedAppointment.title}" ได้รับการยืนยันวันและเวลาแล้ว`,
            'appointment_confirmed',
          );
        } catch (notificationError) {
          request.log.error(
            notificationError,
            'Failed to notify confirmed appointment members',
          );
        }
      }

      return reply.send({
        message: 'สรุปวันนัดหมายเรียบร้อยแล้ว',
        appointment: updatedAppointment,
      });
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        message: 'ไม่สามารถสรุปวันนัดหมายได้',
      });
    }
  });



  fastify.post('/:id/respond', async (request, reply) => {
    try {
      await request.jwtVerify();

      const userId = extractUserId(request);
      const { id: appointmentId } = request.params as { id: string };
      const { response } = request.body as {
        response?: 'accept' | 'reject';
      };

      if (!userId) {
        return reply.code(401).send({
          message: 'กรุณาเข้าสู่ระบบใหม่',
        });
      }

      if (response !== 'accept' && response !== 'reject') {
        return reply.code(400).send({
          message: 'response ต้องเป็น accept หรือ reject',
        });
      }

      // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของนัดหมายนี้จริง
      const [membership] = await db
        .select({
          userId: appointmentMembers.userId,
        })
        .from(appointmentMembers)
        .where(
          and(
            eq(appointmentMembers.appointmentId, appointmentId),
            eq(appointmentMembers.userId, userId)
          )
        )
        .limit(1);

      if (!membership) {
        return reply.code(403).send({
          message: 'คุณไม่มีสิทธิ์ตอบรับนัดหมายนี้',
        });
      }

      const newStatus = response === 'accept' ? 'accepted' : 'declined';

      await db
        .update(appointmentMembers)
        .set({
          status: newStatus,
        })
        .where(
          and(
            eq(appointmentMembers.appointmentId, appointmentId),
            eq(appointmentMembers.userId, userId)
          )
        );

      return reply.send({
        success: true,
        appointmentId,
        userId,
        response,
        status: newStatus,
        message:
          response === 'accept'
            ? 'ตอบรับคำเชิญเรียบร้อยแล้ว'
            : 'ปฏิเสธคำเชิญเรียบร้อยแล้ว',
      });
    } catch (err: any) {
      request.log.error({ err }, 'Failed to respond to appointment');

      if (err?.statusCode === 401) {
        return reply.code(401).send({
          message: 'กรุณาเข้าสู่ระบบใหม่',
        });
      }

      return reply.code(500).send({
        message: 'ไม่สามารถบันทึกคำตอบได้',
      });
    }
  });


  // 8. POST /api/appointments

  fastify.post('/', async (request: any, reply) => {
    try {
      await request.jwtVerify();

      const userId = extractUserId(request);
      if (!userId) {
        return reply.status(401).send({ message: 'Unauthorized' });
      }

      const body = (request.body || {}) as any;

      request.log.info({
        startDate: body.startDate,
        endDate: body.endDate,
        dateText: body.dateText,
        startTime: body.startTime,
        endTime: body.endTime,
        formattedStartDate: formatToIsoDateStr(
          body.startDate || body.dateText
        ),
        formattedEndDate: formatToIsoDateStr(body.endDate),
      }, 'Appointment date debug');

      const {
        title,
        category,
        withWho,
        groupId,
        location,
        budget,
        topic,
        meetingMode,
        meetingLink,
        tripType,
        accommodation,
        startDate,
        endDate,
        dateText,
        startTime,
        endTime,
        duration,
        notes,
        recurring,
        voteEnabled,
        notifyEnabled,
        appDecide,
        invitedFriendIds,
        polls,
      } = body;

      if (typeof title !== 'string' || !title.trim()) {
        return reply.status(400).send({
          message: 'กรุณาระบุชื่อกิจกรรม',
        });
      }

      const validCategories = ['food', 'trip', 'work', 'personal'];
      if (!validCategories.includes(category)) {
        return reply.status(400).send({
          message: 'หมวดหมู่กิจกรรมไม่ถูกต้อง',
        });
      }

      const isVote = Boolean(voteEnabled);
      const formattedStartDate = formatToIsoDateStr(startDate || dateText);
      let formattedEndDate = formatToIsoDateStr(endDate);

      if (!formattedStartDate) {
        return reply.status(400).send({
          message: 'กรุณาระบุวันที่นัดหมายให้ถูกต้อง',
        });
      }

      const isMultiDayTrip = category === 'trip' && tripType === 'multi';

      let startAt: Date | null = null;
      let endAt: Date | null = null;

      if (isMultiDayTrip) {
        if (!formattedEndDate || formattedEndDate < formattedStartDate) {
          return reply.status(400).send({
            message: 'กรุณาระบุวันที่เดินทางกลับให้ถูกต้อง',
          });
        }

        startAt = combineDateAndTime(formattedStartDate, '00:00');
        endAt = combineDateAndTime(
          addDaysToDateKey(formattedEndDate, 1),
          '00:00',
        );
      } else if (category !== 'personal') {
        startAt = combineDateAndTime(formattedStartDate, startTime);
        endAt = combineDateAndTime(formattedStartDate, endTime);

        if (!startAt || !endAt) {
          return reply.status(400).send({
            message: 'กรุณาระบุเวลาเริ่มและเวลาสิ้นสุดให้ถูกต้อง',
          });
        }

        if (endAt.getTime() < startAt.getTime()) {
          endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
          formattedEndDate = addDaysToDateKey(formattedStartDate, 1);
        }
      }

      const memberIds: string[] = Array.isArray(invitedFriendIds)
        ? [...new Set(invitedFriendIds.filter(
          (value: unknown): value is string =>
            typeof value === 'string',
        ))]
        : [];

      if (memberIds.some((id) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      )) {
        return reply.status(400).send({
          message: 'รหัสผู้ได้รับเชิญไม่ถูกต้อง',
        });
      }

      const pollInput = Array.isArray(polls) ? polls : [];

      for (const poll of pollInput) {
        if (
          typeof poll?.title !== 'string' ||
          !poll.title.trim() ||
          !Array.isArray(poll.options) ||
          poll.options.length < 2 ||
          poll.options.some(
            (option: any) =>
              typeof option?.label !== 'string' ||
              !option.label.trim(),
          )
        ) {
          return reply.status(400).send({
            message: 'แต่ละหัวข้อโหวตต้องมีชื่อและตัวเลือกอย่างน้อย 2 ตัวเลือก',
          });
        }
      }

      const validPollKinds = [
        'general', 'date', 'time', 'place', 'activity',
      ];

      if (pollInput.some(
        (poll: any) =>
          poll.kind != null && !validPollKinds.includes(poll.kind),
      )) {
        return reply.status(400).send({
          message: 'ประเภทหัวข้อโหวตไม่ถูกต้อง',
        });
      }

      const appointment = await db.transaction(async (tx) => {
        // ตรวจว่าผู้สร้างมีสิทธิ์ใช้กลุ่มที่เลือก
        let authorizedGroupId: string | null = null;

        if (withWho === 'group') {
          if (typeof groupId !== 'string') {
            throw new Error('INVALID_GROUP');
          }

          const [group] = await tx
            .select()
            .from(friendGroups)
            .where(eq(friendGroups.id, groupId))
            .limit(1);

          if (!group) throw new Error('INVALID_GROUP');

          const isOwner = group.ownerId === userId;

          const [membership] = await tx
            .select()
            .from(friendGroupMembers)
            .where(and(
              eq(friendGroupMembers.groupId, groupId),
              eq(friendGroupMembers.userId, userId),
            ))
            .limit(1);

          if (!isOwner && !membership) {
            throw new Error('FORBIDDEN_GROUP');
          }

          authorizedGroupId = groupId;
        }

        // ต้องมีบัญชีผู้ใช้จริงสำหรับผู้ได้รับเชิญทุกคน
        const allMemberIds = [...new Set([userId, ...memberIds])];

        const foundUsers = await tx
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.id, allMemberIds));

        if (foundUsers.length !== allMemberIds.length) {
          throw new Error('INVALID_INVITEE');
        }

        // ตรวจสอบความเป็นเพื่อน/สมาชิกกลุ่มก่อนเชิญ
        // กรณีกลุ่ม: เชิญได้เฉพาะสมาชิกของกลุ่มหรือเจ้าของกลุ่ม
        if (authorizedGroupId) {
          const group = await tx
            .select({ ownerId: friendGroups.ownerId })
            .from(friendGroups)
            .where(eq(friendGroups.id, authorizedGroupId))
            .limit(1);

          const groupOwnerId = group[0]?.ownerId;

          const groupMembers = await tx
            .select({ userId: friendGroupMembers.userId })
            .from(friendGroupMembers)
            .where(eq(friendGroupMembers.groupId, authorizedGroupId));

          const allowedIds = new Set([
            ...(groupOwnerId ? [groupOwnerId] : []),
            ...groupMembers.map((member) => member.userId),
          ]);

          if (memberIds.some((id) => !allowedIds.has(id))) {
            throw new Error('INVALID_INVITEE');
          }
        }

        const [created] = await tx
          .insert(appointments)
          .values({
            title: title.trim(),
            category,
            creatorId: userId,
            groupId: authorizedGroupId,
            location: typeof location === 'string' ? location.trim() : null,
            budget: budget == null || budget === '' ? null : String(budget),
            topic: topic ?? null,
            meetingMode: meetingMode ?? null,
            meetingLink: meetingLink ?? null,
            tripType: category === 'trip' ? (tripType ?? null) : null,
            accommodation: accommodation ?? null,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            startAt,
            endAt,
            duration: duration ?? null,
            notes: notes ?? null,
            recurring: recurring ?? 'none',
            appDecide: appDecide ?? true,
            voteEnabled: voteEnabled ?? true,
            isVote,
            notifyEnabled: notifyEnabled ?? true,
            status: isVote ? 'pending' : 'confirmed',
            statusText: isVote ? 'รอโหวต' : 'ยืนยันแล้ว',
            updatedAt: new Date(),
          })
          .returning();

        // ผู้สร้างเป็นสมาชิก accepted; ผู้ได้รับเชิญเริ่มที่ pending
        await tx.insert(appointmentMembers).values(
          allMemberIds.map((memberId) => ({
            appointmentId: created.id,
            userId: memberId,
            status: memberId === userId ? 'accepted' : 'pending',
          })),
        );

        // บันทึกหัวข้อและตัวเลือกโหวต
        for (const poll of pollInput) {
          const [createdPoll] = await tx
            .insert(appointmentPolls)
            .values({
              appointmentId: created.id,
              title: poll.title.trim(),
              kind: poll.kind ?? 'general',
            })
            .returning();

          await tx.insert(appointmentPollOptions).values(
            poll.options.map((option: any) => ({
              pollId: createdPoll.id,
              label: option.label.trim(),
              startAt: option.startAt
                ? parseToDate(option.startAt)
                : null,
              endAt: option.endAt
                ? parseToDate(option.endAt)
                : null,
              location: option.location ?? null,
              placeId: option.placeId ?? null,
            })),
          );
        }

        return created;
      });

      if (appointment.notifyEnabled) {
        try {
          const isPoll = Boolean(isVote && pollInput.length > 0);

          await notifyAppointmentMembers(
            fastify,
            appointment.id,
            userId,
            isPoll ? 'มีการเปิดโหวตนัดหมาย' : 'มีนัดหมายใหม่',
            isPoll
              ? `มีการเปิดโหวตสำหรับนัดหมาย "${appointment.title}" กรุณาเข้าไปเลือกตัวเลือก`
              : `คุณได้รับเชิญเข้าร่วมนัดหมาย "${appointment.title}"`,
            isPoll ? 'appointment_poll' : 'appointment_created',
          );
        } catch (error) {
          request.log.error(error, 'Failed to notify appointment members');
        }
      }

      return reply.status(201).send({
        message: 'สร้างนัดหมายสำเร็จ',
        appointment,
      });
    } catch (err: any) {
      if (err?.message === 'INVALID_GROUP') {
        return reply.status(400).send({
          message: 'ไม่พบกลุ่มที่เลือก',
        });
      }

      if (err?.message === 'FORBIDDEN_GROUP') {
        return reply.status(403).send({
          message: 'คุณไม่มีสิทธิ์สร้างนัดหมายในกลุ่มนี้',
        });
      }

      if (err?.message === 'INVALID_INVITEE') {
        return reply.status(400).send({
          message: 'ผู้ได้รับเชิญบางคนไม่ถูกต้องหรือไม่มีสิทธิ์เข้ากลุ่ม',
        });
      }

      request.log.error(err);
      return reply.status(500).send({
        message: 'ไม่สามารถสร้างนัดหมายได้',
      });
    }
  });


  // DELETE /api/appointments/:id
  fastify.delete('/:id', async (request: any, reply) => {
    try {
      await request.jwtVerify();

      const userId = extractUserId(request);
      const { id } = request.params as { id: string };

      if (!userId) {
        return reply.code(401).send({
          message: 'กรุณาเข้าสู่ระบบใหม่',
        });
      }

      // อนุญาตให้เฉพาะผู้สร้างนัดหมายลบได้
      const appointment = await getAppointmentForOwner(id, userId);

      if (!appointment) {
        return reply.code(404).send({
          message: 'ไม่พบนัดหมาย หรือคุณไม่มีสิทธิ์ลบ',
        });
      }

      await db.transaction(async (tx) => {
        // ดึงหัวข้อโหวตของนัดหมาย
        const pollRows = await tx
          .select({ id: appointmentPolls.id })
          .from(appointmentPolls)
          .where(eq(appointmentPolls.appointmentId, id));

        const pollIds = pollRows.map((poll) => poll.id);

        if (pollIds.length > 0) {
          const optionRows = await tx
            .select({ id: appointmentPollOptions.id })
            .from(appointmentPollOptions)
            .where(inArray(appointmentPollOptions.pollId, pollIds));

          const optionIds = optionRows.map((option) => option.id);

          if (optionIds.length > 0) {
            await tx
              .delete(appointmentPollVotes)
              .where(inArray(appointmentPollVotes.optionId, optionIds));
          }

          await tx
            .delete(appointmentPollOptions)
            .where(inArray(appointmentPollOptions.pollId, pollIds));

          await tx
            .delete(appointmentPolls)
            .where(eq(appointmentPolls.appointmentId, id));
        }

        await tx
          .delete(appointmentMembers)
          .where(eq(appointmentMembers.appointmentId, id));

        await tx
          .delete(appointments)
          .where(
            and(
              eq(appointments.id, id),
              eq(appointments.creatorId, userId),
            ),
          );
      });

      return reply.send({
        success: true,
        message: 'ลบนัดหมายเรียบร้อยแล้ว',
      });
    } catch (err: any) {
      request.log.error({ err }, 'Failed to delete appointment');

      if (err?.statusCode === 401) {
        return reply.code(401).send({
          message: 'กรุณาเข้าสู่ระบบใหม่',
        });
      }

      return reply.code(500).send({
        message: 'ไม่สามารถลบนัดหมายได้',
      });
    }
  });



}