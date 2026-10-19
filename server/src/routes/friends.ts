import { and, eq, or } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { friends, notifications, users } from '../db/schema';

export async function friendRoutes(fastify: FastifyInstance) {
  // 1. GET /api/friends - ดึงรายชื่อเพื่อนที่ยอมรับแล้ว (accepted)
  fastify.get('/', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const currentUserId = request.user.userId;

      const friendRelations = await db
        .select({
          userId: friends.userId,
          friendId: friends.friendId,
          status: friends.status,
          createdAt: friends.createdAt,
        })
        .from(friends)
        .where(
          and(
            or(eq(friends.userId, currentUserId), eq(friends.friendId, currentUserId)),
            eq(friends.status, 'accepted')
          )
        );

      const friendUserIds = friendRelations.map((f) =>
        f.userId === currentUserId ? f.friendId : f.userId
      );

      if (friendUserIds.length === 0) {
        return reply.send([]);
      }

      const friendList = await db
        .select({
          id: users.id,
          name: users.displayName,
          username: users.username,
          email: users.email,
          avatar: users.avatarUrl,
        })
        .from(users)
        .where(
          or(...friendUserIds.map((id) => eq(users.id, id)))
        );

      return reply.send(friendList);
    } catch (err) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
  });

  // 2. POST /api/friends/add-by-code - เพิ่มเพื่อนด้วย Friend Code (เช่น FC-A1B2C3)
  fastify.post('/add-by-code', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const currentUserId = request.user.userId;
      const { friendCode } = request.body as { friendCode?: string };

      if (!friendCode || !friendCode.trim()) {
        return reply.status(400).send({ message: 'กรุณาระบุรหัสเพื่อน (Friend Code)' });
      }

      const cleanCode = friendCode.trim().toUpperCase();

      // ค้นหาผู้ใช้งานด้วย Friend Code
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.friendCode, cleanCode))
        .limit(1);

      if (!targetUser) {
        return reply.status(404).send({ message: 'ไม่พบผู้ใช้งานที่มีรหัสเพื่อนนี้' });
      }

      if (targetUser.id === currentUserId) {
        return reply.status(400).send({ message: 'ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้' });
      }

      // ตรวจสอบว่ามีความสัมพันธ์กันอยู่แล้วหรือยัง
      const [existing] = await db
        .select()
        .from(friends)
        .where(
          or(
            and(eq(friends.userId, currentUserId), eq(friends.friendId, targetUser.id)),
            and(eq(friends.userId, targetUser.id), eq(friends.friendId, currentUserId))
          )
        )
        .limit(1);

      if (existing) {
        if (existing.status === 'accepted') {
          return reply.status(400).send({ message: 'คุณเป็นเพื่อนกันอยู่แล้ว' });
        }
        return reply.status(400).send({ message: 'มีคำขอเป็นเพื่อนส่งไปแล้ว หรือรอการตอบรับอยู่' });
      }

      // ดึงข้อมูลผู้ส่งคำขอเพื่อนำไปทำ Notification
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, currentUserId))
        .limit(1);

      // บันทึกคำขอเป็นเพื่อน
      await db.insert(friends).values({
        userId: currentUserId,
        friendId: targetUser.id,
        status: 'pending',
      });

      // แจ้งเตือนไปยังผู้รับคำขอ (ถ้าตาราง notifications มีอยู่)
      try {
        await db.insert(notifications).values({
          userId: targetUser.id,
          title: 'คำขอเป็นเพื่อนใหม่',
          message: `${currentUser?.displayName || 'มีคน'} ส่งคำขอเป็นเพื่อนถึงคุณ`,
          type: 'friend_request',
          data: JSON.stringify({ requesterId: currentUserId }),
          isRead: false,
        });
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }

      return reply.status(201).send({
        message: `ส่งคำขอเป็นเพื่อนไปยัง ${targetUser.displayName} เรียบร้อยแล้ว`,
        targetUser: {
          id: targetUser.id,
          name: targetUser.displayName,
          username: targetUser.username,
          avatar: targetUser.avatarUrl,
        },
      });
    } catch (err) {
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการเพิ่มเพื่อน' });
    }
  });

  // 3. GET /api/friends/requests - ดึงคำขอเป็นเพื่อนที่รอการตอบรับ
  fastify.get('/requests', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const currentUserId = request.user.userId;

      const pendingRequests = await db
        .select({
          senderId: friends.userId,
          createdAt: friends.createdAt,
          displayName: users.displayName,
          username: users.username,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(friends)
        .innerJoin(users, eq(friends.userId, users.id))
        .where(
          and(
            eq(friends.friendId, currentUserId),
            eq(friends.status, 'pending')
          )
        );

      return reply.send(pendingRequests || []);
    } catch (err) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
  });

  // 4. PUT /api/friends/accept - ตอบรับคำขอเป็นเพื่อน
  fastify.put('/accept', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const currentUserId = request.user.userId;
      const { requesterId } = request.body as { requesterId: string };

      if (!requesterId) {
        return reply.status(400).send({ message: 'กรุณาระบุ ID ของผู้ส่งคำขอ' });
      }

      const updated = await db
        .update(friends)
        .set({ status: 'accepted' })
        .where(
          and(
            eq(friends.userId, requesterId),
            eq(friends.friendId, currentUserId),
            eq(friends.status, 'pending')
          )
        )
        .returning();

      if (updated.length === 0) {
        return reply.status(404).send({ message: 'ไม่พบคำขอเป็นเพื่อนนี้' });
      }

      return reply.send({ message: 'ตอบรับคำขอเป็นเพื่อนเรียบร้อยแล้ว' });
    } catch (err) {
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการตอบรับคำขอ' });
    }
  });

  // 5. DELETE /api/friends/:friendId - ลบเพื่อน หรือ ปฏิเสธคำขอ
  fastify.delete('/:friendId', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const currentUserId = request.user.userId;
      const { friendId } = request.params as { friendId: string };

      await db
        .delete(friends)
        .where(
          or(
            and(eq(friends.userId, currentUserId), eq(friends.friendId, friendId)),
            and(eq(friends.userId, friendId), eq(friends.friendId, currentUserId))
          )
        );

      return reply.send({ message: 'ลบเพื่อนเรียบร้อยแล้ว' });
    } catch (err) {
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการลบเพื่อน' });
    }
  });
}