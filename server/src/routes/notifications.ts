import { and, desc, eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { notifications } from '../db/schema';

export async function notificationRoutes(fastify: FastifyInstance) {
  // 1. GET /api/notifications - ดึงรายการแจ้งเตือนทั้งหมดของผู้ใช้
  fastify.get('/', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;

      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));

      const unreadCount = userNotifications.filter((n) => !n.isRead).length;

      return reply.send({
        unreadCount,
        data: userNotifications || [],
      });
    } catch (err) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
  });

  // 2. PUT /api/notifications/:id/read - อ่านแจ้งเตือนอันเดียว
  fastify.put('/:id/read', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      const updated = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        .returning();

      if (updated.length === 0) {
        return reply.status(404).send({ message: 'ไม่พบรายการแจ้งเตือน' });
      }

      return reply.send({ message: 'อัปเดตสถานะการอ่านเรียบร้อยแล้ว' });
    } catch (err) {
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการอัปเดต' });
    }
  });

  // 3. PUT /api/notifications/read-all - อ่านการแจ้งเตือนทั้งหมด
  fastify.put('/read-all', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

      return reply.send({ message: 'อ่านการแจ้งเตือนทั้งหมดเรียบร้อยแล้ว' });
    } catch (err) {
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการอัปเดต' });
    }
  });

  // 4. POST /api/notifications - สร้าง/ส่งการแจ้งเตือน
  fastify.post('/', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const { targetUserId, title, message, type, data } = request.body as any;

      if (!targetUserId || !title || !message) {
        return reply.status(400).send({ message: 'กรุณากรอกข้อมูลการแจ้งเตือนให้ครบถ้วน' });
      }

      const [newNotification] = await db
        .insert(notifications)
        .values({
          userId: targetUserId,
          title: title.trim(),
          message: message.trim(),
          type: type || 'general',
          data: data ? JSON.stringify(data) : null,
          isRead: false,
        })
        .returning();

      return reply.status(201).send(newNotification);
    } catch (err) {
      return reply.status(500).send({ message: 'ไม่สามารถสร้างรายการแจ้งเตือนได้' });
    }
  });

  // 5. DELETE /api/notifications/:id - ลบการแจ้งเตือน
  fastify.delete('/:id', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      await db
        .delete(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

      return reply.send({ message: 'ลบรายการแจ้งเตือนเรียบร้อยแล้ว' });
    } catch (err) {
      return reply.status(500).send({ message: 'เกิดข้อผิดพลาดในการลบแจ้งเตือน' });
    }
  });
}