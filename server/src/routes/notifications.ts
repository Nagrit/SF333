import { and, desc, eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { notifications, userPushTokens } from '../db/schema';

export async function notificationRoutes(fastify: FastifyInstance) {

  fastify.post('/push-token', async (request: any, reply) => {
    try {
      await request.jwtVerify();

      const userId = request.user.userId;
      const body = request.body as {
        token?: string;
        platform?: string;
      };

      const token = body?.token?.trim();
      const platform = body?.platform;

      if (
        !token ||
        !/^Expo(nent)?PushToken\[[^\]]+\]$/.test(token)
      ) {
        return reply.status(400).send({
          message: 'Push Token ไม่ถูกต้อง',
        });
      }

      const [savedToken] = await db
        .insert(userPushTokens)
        .values({
          userId,
          token,
          platform:
            platform === 'ios' || platform === 'android'
              ? platform
              : null,
          enabled: true,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userPushTokens.token,
          set: {
            userId,
            platform:
              platform === 'ios' || platform === 'android'
                ? platform
                : null,
            enabled: true,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: userPushTokens.id,
          platform: userPushTokens.platform,
          enabled: userPushTokens.enabled,
        });

      return reply.status(200).send({
        message: 'ลงทะเบียน Push Token สำเร็จ',
        data: savedToken,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        message: 'ไม่สามารถลงทะเบียน Push Token ได้',
      });
    }
  });


  // ทดสอบส่ง Push ไปยังอุปกรณ์ของผู้ใช้ที่ล็อกอินอยู่เท่านั้น
  fastify.post('/test-push', async (request: any, reply) => {
    try {
      await request.jwtVerify();

      const userId = request.user.userId;

      const [savedToken] = await db
        .select({
          token: userPushTokens.token,
        })
        .from(userPushTokens)
        .where(
          and(
            eq(userPushTokens.userId, userId),
            eq(userPushTokens.enabled, true),
          ),
        )
        .limit(1);

      if (!savedToken) {
        return reply.status(404).send({
          message: 'ไม่พบ Push Token ที่เปิดใช้งานสำหรับบัญชีนี้',
        });
      }

      const { Expo } = await import('expo-server-sdk');
      const expo = new Expo();

      if (!Expo.isExpoPushToken(savedToken.token)) {
        return reply.status(400).send({
          message: 'Push Token ในฐานข้อมูลไม่ถูกต้อง',
        });
      }

      const tickets = await expo.sendPushNotificationsAsync([
        {
          to: savedToken.token,
          sound: 'default',
          title: 'SF333 ทดสอบการแจ้งเตือน',
          body: 'Push Notification ทำงานแล้ว!',
          data: { type: 'test' },
          channelId: 'default',
        },
      ]);

      request.log.info({ tickets }, '[Push Test] Expo response');

      return reply.send({
        message: 'ส่งคำขอ Push ไปยัง Expo แล้ว',
        result: tickets.map((ticket) =>
          ticket.status === 'ok'
            ? { status: ticket.status, id: ticket.id }
            : { status: ticket.status, message: ticket.message },
        ),
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        message: 'ส่ง Push Notification ทดสอบไม่สำเร็จ',
      });
    }
  });



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