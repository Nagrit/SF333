import { and, eq, inArray } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { appointments, friendGroupMembers, friendGroups, users } from '../db/schema';

export async function groupRoutes(fastify: FastifyInstance) {
  // 1. GET /api/groups - ดึงกลุ่มทั้งหมดของผู้ใช้งาน
  fastify.get('/', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;

      const myMemberships = await db
        .select({ groupId: friendGroupMembers.groupId })
        .from(friendGroupMembers)
        .where(eq(friendGroupMembers.userId, userId));

      const groupIds = myMemberships.map((m) => m.groupId);
      if (groupIds.length === 0) return reply.send([]);

      const groupList = await db
        .select()
        .from(friendGroups)
        .where(inArray(friendGroups.id, groupIds));

      const result = await Promise.all(
        groupList.map(async (group) => {
          const membersData = await db
            .select({
              avatarUrl: users.avatarUrl,
            })
            .from(friendGroupMembers)
            .innerJoin(users, eq(friendGroupMembers.userId, users.id))
            .where(eq(friendGroupMembers.groupId, group.id));

          return {
            id: group.id,
            name: group.name,
            icon: group.icon || 'laptop',
            lastActive: 'เร็วๆ นี้',
            membersCount: membersData.length,
            avatars: membersData.map((m) => m.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'),
          };
        })
      );

      return reply.send(result);
    } catch (err) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
  });

  // ➕➕ [เพิ่มใหม่] POST /api/groups - สร้างกลุ่มใหม่
  fastify.post('/', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;
      const { name, icon, memberIds } = request.body as {
        name: string;
        icon?: string;
        memberIds?: string[];
      };

      if (!name || !name.trim()) {
        return reply.status(400).send({ message: 'กรุณาระบุชื่อกลุ่ม' });
      }

      // 1. สร้างกลุ่มในตาราง friendGroups
      const [newGroup] = await db
        .insert(friendGroups)
        .values({
          name: name.trim(),
          icon: icon || 'laptop',
          ownerId: userId,
        })
        .returning();

      // 2. รวบรวม ID สมาชิก (ผู้สร้างกลุ่ม + เพื่อนที่ถูกเลือก)
      const allMemberIds = Array.from(new Set([userId, ...(memberIds || [])]));

      // 3. เพิ่มสมาชิกลงในตาราง friendGroupMembers
      const membersToInsert = allMemberIds.map((mId) => ({
        groupId: newGroup.id,
        userId: mId,
        role: mId === userId ? 'owner' : 'member',
      }));

      await db.insert(friendGroupMembers).values(membersToInsert);

      return reply.status(201).send({
        message: 'สร้างกลุ่มเรียบร้อยแล้ว',
        group: newGroup,
      });
    } catch (err) {
      console.error('Error creating group:', err);
      return reply.status(500).send({ message: 'ไม่สามารถสร้างกลุ่มได้' });
    }
  });

  // 2. GET /api/groups/:id - ดึงรายละเอียดกลุ่มและรายชื่อสมาชิก
  fastify.get('/:id', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };

      const [group] = await db
        .select()
        .from(friendGroups)
        .where(eq(friendGroups.id, id))
        .limit(1);

      if (!group) {
        return reply.status(404).send({ message: 'ไม่พบข้อมูลกลุ่ม' });
      }

      const members = await db
        .select({
          id: users.id,
          name: users.displayName,
          username: users.username,
          avatar: users.avatarUrl,
        })
        .from(friendGroupMembers)
        .innerJoin(users, eq(friendGroupMembers.userId, users.id))
        .where(eq(friendGroupMembers.groupId, id));

      const formattedMembers = members.map((m) => ({
        id: m.id,
        name: m.name || 'ผู้ใช้งาน',
        username: m.username || 'user',
        avatar: m.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      }));

      return reply.send({
        id: group.id,
        name: group.name,
        createdBy: group.ownerId,
        allowMemberInvite: group.allowMemberInvite ?? true,
        members: formattedMembers,
      });
    } catch (err) {
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลกลุ่ม' });
    }
  });

  // 3. GET /api/groups/:id/appointments - ดึงนัดหมายในกลุ่ม
  fastify.get('/:id/appointments', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };

      const groupAppoints = await db
        .select({
          id: appointments.id,
          title: appointments.title,
          category: appointments.category,
          startDate: appointments.startDate,
          startAt: appointments.startAt,
          location: appointments.location,
          creatorId: appointments.creatorId,
          creatorName: users.displayName,
          isVote: appointments.isVote,
          statusText: appointments.statusText,
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.creatorId, users.id))
        .where(eq(appointments.groupId, id));

      const formatted = groupAppoints.map((item) => {
        let dateText = 'ไม่ระบุวันเวลา';
        if (item.startDate) {
          dateText = item.startDate;
        } else if (item.startAt) {
          dateText = new Date(item.startAt).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }

        return {
          id: item.id,
          title: item.title,
          category: item.category || 'ทั่วไป',
          dateText,
          location: item.location || '',
          creator: item.creatorName || 'สมาชิกในกลุ่ม',
          isVote: item.isVote ?? false,
          statusText: item.statusText || (item.isVote ? 'รอโหวต' : 'ยืนยันแล้ว'),
          avatars: ['https://cdn-icons-png.flaticon.com/512/149/149071.png'],
        };
      });

      return reply.send(formatted);
    } catch (err) {
      return reply.send([]);
    }
  });

  // 4. PUT /api/groups/:id - แก้ไขข้อมูลกลุ่ม
  fastify.put('/:id', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };
      const { name, allowMemberInvite } = request.body as any;

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (allowMemberInvite !== undefined) updateData.allowMemberInvite = allowMemberInvite;

      const [updated] = await db
        .update(friendGroups)
        .set(updateData)
        .where(eq(friendGroups.id, id))
        .returning();

      return reply.send(updated);
    } catch (err) {
      return reply.status(500).send({ message: 'ไม่สามารถแก้ไขกลุ่มได้' });
    }
  });

  // 5. DELETE /api/groups/:id - ลบกลุ่ม
  fastify.delete('/:id', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { id } = request.params as { id: string };

      await db.delete(friendGroupMembers).where(eq(friendGroupMembers.groupId, id));
      await db.delete(friendGroups).where(eq(friendGroups.id, id));

      return reply.send({ message: 'ลบกลุ่มเรียบร้อยแล้ว' });
    } catch (err) {
      return reply.status(500).send({ message: 'ไม่สามารถลบกลุ่มได้' });
    }
  });

  // 6. DELETE /api/groups/:id/members/:memberId - ลบสมาชิกออกจากกลุ่ม
  fastify.delete('/:id/members/:memberId', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { id, memberId } = request.params as { id: string; memberId: string };

      await db
        .delete(friendGroupMembers)
        .where(and(eq(friendGroupMembers.groupId, id), eq(friendGroupMembers.userId, memberId)));

      return reply.send({ message: 'นำสมาชิกออกจากกลุ่มเรียบร้อยแล้ว' });
    } catch (err) {
      return reply.status(500).send({ message: 'ไม่สามารถนำสมาชิกออกได้' });
    }
  });
}