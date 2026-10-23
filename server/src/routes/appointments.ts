// server/src/routes/appointments.ts
import { and, eq, inArray, or } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { appointments, friendGroupMembers, friendGroups, groups } from '../db/schema';

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

function formatToIsoDateStr(val: any): string | null {
  if (!val) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    const thaiMonths: Record<string, string> = {
      'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04',
      'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08',
      'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12'
    };
    const parts = val.trim().split(/\s+/);
    if (parts.length === 3 && thaiMonths[parts[1]]) {
      const day = parts[0].padStart(2, '0');
      const month = thaiMonths[parts[1]];
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

function combineDateAndTime(
  dateValue: unknown,
  timeValue: unknown
): Date | null {
  const dateKey = formatToIsoDateStr(dateValue);

  if (!dateKey || typeof timeValue !== 'string') return null;

  const match = timeValue.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
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

      // ✅ จุดที่แก้ 3: สกัดไว้ก่อน ป้องกันไม่ให้สั่ง Query แบบไม่ใส่เงื่อนไข
      if (!userId) {
        return reply.status(401).send({ message: 'Unauthorized: Missing User ID' });
      }

      const groupIds = await getUserGroupIds(userId);

      // ✅ จุดที่แก้ 4: ใส่เงื่อนไขกรองเฉพาะ creatorId หรือ groupId ของผู้ใช้
      const conditions = [eq(appointments.creatorId, userId)];
      if (groupIds.length > 0) {
        conditions.push(inArray(appointments.groupId, groupIds));
      }

      const myAppointments = await db
        .select()
        .from(appointments)
        .where(or(...conditions));

      const formatted = myAppointments.map((item) => {
        const isConfirmed = item.status === 'confirmed';

        // ✅ จุดที่แก้ 5: เติม status, category, categoryKey กลับไปให้ Frontend ใช้
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

      return formatted;
    } catch (err) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
  });

  // 3. GET /api/appointments/:id
  fastify.get('/:id', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };

      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!appointment) {
        return reply.status(404).send({ message: 'ไม่พบนัดหมายนี้' });
      }

      return reply.send({
        appointment: {
          ...appointment,
          members: (appointment as any).members || [],
        },
      });
    } catch (err) {
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลนัดหมาย' });
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
        return reply.status(404).send({ message: 'ไม่พบนัดหมายนี้' });
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

      const formattedDate = appointment.startDate
        ? new Date(appointment.startDate).toLocaleDateString('th-TH', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        : 'ไม่ระบุวัน';

      const formattedTime = appointment.startAt
        ? new Date(appointment.startAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
        : 'ไม่ระบุเวลา';

      return reply.send({
        appointmentId: appointment.id,
        title: appointment.title,
        groupName,
        isOrganizer: appointment.creatorId === userId,
        isVote: appointment.isVote,
        status: appointment.status,
        userSelectedIds: [],
        options: [
          {
            id: 'opt-1',
            title: 'วันและเวลาที่เสนอ',
            date: formattedDate,
            time: formattedTime,
            votes: '0 คน',
            progress: 0,
            avatars: [],
          }
        ]
      });
    } catch (err) {
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโหวต' });
    }
  });

  // 5. POST /api/appointments/:id/vote
  fastify.post('/:id/vote', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };
      const { optionIds } = (request.body as any) || {};

      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!appointment) {
        return reply.status(404).send({ message: 'ไม่พบนัดหมายนี้' });
      }

      return reply.send({
        message: 'บันทึกการโหวตเรียบร้อยแล้ว',
        appointmentId: id,
        optionIds: optionIds || [],
      });
    } catch (err) {
      return reply.status(500).send({ message: 'ไม่สามารถส่งผลโหวตได้' });
    }
  });

  // 6. GET /api/appointments/:id/vote-result
  fastify.get('/:id/vote-result', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };

      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!appointment) {
        return reply.status(404).send({ message: 'ไม่พบนัดหมายนี้' });
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

      const formattedStartDate = appointment.startDate
        ? new Date(appointment.startDate).toLocaleDateString('th-TH', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'วันนัดหมายหลัก';

      const formattedTime = appointment.startAt
        ? `${new Date(appointment.startAt).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
          })} น.`
        : 'ไม่ระบุเวลา';

      const rawResults = [
        {
          id: 'opt-1',
          title: formattedStartDate,
          time: formattedTime,
          votesCount: 1,
          totalMembers: 1,
          avatars: [],
        },
      ];

      const results = rawResults.map((item, index) => {
        const isWinner = index === 0;
        const progress = item.totalMembers > 0 ? item.votesCount / item.totalMembers : 0;

        return {
          id: item.id,
          rank: `อันดับ ${index + 1}`,
          rankBg: isWinner ? '#eef5f4' : '#f3f4f6',
          rankColor: isWinner ? '#217371' : '#6b7280',
          title: item.title,
          time: item.time,
          status: `ว่าง ${item.votesCount}/${item.totalMembers} คน`,
          statusColor: isWinner ? '#22c55e' : '#e08955',
          progress: Number(progress.toFixed(2)),
          isWinner,
          avatars: item.avatars || [],
        };
      });

      return reply.send({
        appointmentId: appointment.id,
        title: appointment.title,
        group: groupName,
        results,
      });
    } catch (err) {
      console.error('Error fetching vote result:', err);
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการดึงสรุปผลโหวต' });
    }
  });

  // 7. POST /api/appointments/:id/confirm
  fastify.post('/:id/confirm', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };
      const { startDate, startTime } = (request.body as any) || {};

      const [updatedAppointment] = await db
        .update(appointments)
        .set({
          isVote: false,
          status: 'confirmed',
          statusText: 'ยืนยันแล้ว',
          startDate: formatToIsoDateStr(startDate),
          startAt: parseToDate(startTime),
          updatedAt: new Date(),
        } as any)
        .where(eq(appointments.id, id))
        .returning();

      if (!updatedAppointment) {
        return reply.status(404).send({ message: 'ไม่พบนัดหมายนี้' });
      }

      return reply.send({
        message: 'สรุปวันนัดหมายเรียบร้อยแล้ว',
        appointment: updatedAppointment,
      });
    } catch (err) {
      console.error('Error confirming appointment:', err);
      return reply.status(500).send({ message: 'ไม่สามารถสรุปวันนัดหมายได้' });
    }
  });

  // 8. POST /api/appointments
  fastify.post('/', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const userId = extractUserId(request);

      if (!userId) {
        return reply.status(401).send({ message: 'Unauthorized: Missing User ID' });
      }

      const body = request.body || {};
      const {
        title,
        category,
        withWho,
        groupId,
        location,
        startDate,
        endDate,
        dateText,
        startTime,
        endTime,
        tripType,
        voteEnabled,
      } = body;

      if (!title || !title.trim()) {
        return reply.status(400).send({ message: 'กรุณาระบุชื่อกิจกรรม' });
      }

      const isVote = voteEnabled ?? false;
      const statusText = isVote ? 'รอโหวต' : 'ยืนยันแล้ว';

      const formattedStartDate = formatToIsoDateStr(startDate || dateText);
      let formattedEndDate = formatToIsoDateStr(endDate);

      if (!formattedStartDate) {
        return reply.status(400).send({
          message: 'กรุณาระบุวันที่นัดหมายให้ถูกต้อง',
        });
      }

      const isMultiDayTrip =
        category === 'trip' && tripType === 'multi';

      let startAt: Date | null = null;
      let endAt: Date | null = null;

      if (isMultiDayTrip) {
        if (!formattedEndDate) {
          return reply.status(400).send({
            message: 'กรุณาระบุวันที่เดินทางกลับ',
          });
        }

        if (formattedEndDate < formattedStartDate) {
          return reply.status(400).send({
            message: 'วันที่เดินทางกลับต้องไม่ก่อนวันเดินทางไป',
          });
        }

        startAt = combineDateAndTime(formattedStartDate, '00:00');
        endAt = combineDateAndTime(
          addDaysToDateKey(formattedEndDate, 1),
          '00:00'
        );
      } else if (category !== 'personal') {
        startAt = combineDateAndTime(
          formattedStartDate,
          startTime
        );

        endAt = combineDateAndTime(
          formattedStartDate,
          endTime
        );

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

      const [newAppointment] = await db
        .insert(appointments)
        .values({
          title: title.trim(),
          category: category || 'food',
          creatorId: userId,
          groupId: withWho === 'group' ? groupId : null,
          location: location ? location.trim() : '',
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          startAt,
          isVote,
          status: isVote ? 'pending' : 'confirmed',
          statusText,
          endAt
        } as any)
        .returning();

      return reply.status(201).send({
        message: 'สร้างนัดหมายสำเร็จ',
        appointment: newAppointment,
      });
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      return reply.status(500).send({ message: 'ไม่สามารถสร้างนัดหมายได้' });
    }
  });
}