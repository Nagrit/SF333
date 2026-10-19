
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { userDateStatuses, users } from '../db/schema';
import { supabase } from '../lib/supabase';


const DEFAULT_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const VALID_STATUSES = ['green', 'orange', 'red'] as const;

type UserStatus = (typeof VALID_STATUSES)[number];

function getOrGenerateFriendCode(
  userId: string,
  existingCode?: string | null,
) {
  if (existingCode) return existingCode;
  return `FC-${userId.slice(0, 6).toUpperCase()}`;
}

function detectImageType(
  buffer: Buffer,
): { mime: string; extension: string } | null {
  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }

  // PNG
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  ) {
    return { mime: 'image/png', extension: 'png' };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }

  return null;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isValidStatus(value: unknown): value is UserStatus {
  return (
    typeof value === 'string' &&
    VALID_STATUSES.some((status) => status === value)
  );
}

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/user/profile
  fastify.get('/profile', async (request: any, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    try {
      const userId = request.user.userId;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ message: 'ไม่พบผู้ใช้งาน' });
      }

      return reply.send({
        id: user.id,
        name: user.displayName,
        username: user.username || user.email.split('@')[0] || 'user',
        email: user.email,
        friendCode: getOrGenerateFriendCode(user.id, user.friendCode),
        avatar: user.avatarUrl || DEFAULT_AVATAR,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        message: 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้',
      });
    }
  });

  // PUT /api/user/profile
  fastify.put('/profile', async (request: any, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    try {
      const userId = request.user.userId;
      const body = (request.body ?? {}) as {
        name?: unknown;
        email?: unknown;
      };

      const updateData: {
        displayName?: string;
        email?: string;
        avatarUrl?: string | null;
      } = {};

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
          return reply.status(400).send({
            message: 'ชื่อผู้ใช้ไม่ถูกต้อง',
          });
        }
        updateData.displayName = body.name.trim();
      }

      if (body.email !== undefined) {
        if (
          typeof body.email !== 'string' ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
        ) {
          return reply.status(400).send({
            message: 'อีเมลไม่ถูกต้อง',
          });
        }
        updateData.email = body.email.trim().toLowerCase();
      }

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({
          message: 'ไม่มีข้อมูลสำหรับอัปเดต',
        });
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return reply.status(404).send({
          message: 'ไม่พบผู้ใช้งาน',
        });
      }

      return reply.send({
        id: updatedUser.id,
        name: updatedUser.displayName,
        username:
          updatedUser.username ||
          updatedUser.email.split('@')[0] ||
          'user',
        email: updatedUser.email,
        friendCode: getOrGenerateFriendCode(
          updatedUser.id,
          updatedUser.friendCode,
        ),
        avatar: updatedUser.avatarUrl || DEFAULT_AVATAR,
      });
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        message: 'ไม่สามารถอัปเดตข้อมูลโปรไฟล์ได้',
      });
    }
  });


  // POST /api/user/profile/avatar
  fastify.post('/profile/avatar', async (request: any, reply) => {
    // 1. ตรวจ JWT
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({
        message: 'Unauthorized',
      });
    }

    const userId = request.user.userId as string;

    try {
      // 2. รับไฟล์จาก multipart/form-data
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({
          message: 'กรุณาเลือกรูปโปรไฟล์',
        });
      }

      if (file.fieldname !== 'avatar') {
        return reply.status(400).send({
          message: 'ชื่อฟิลด์ไฟล์ไม่ถูกต้อง',
        });
      }

      // 3. ตรวจชนิดไฟล์จากเนื้อหา
      const buffer = await file.toBuffer();
      const imageType = detectImageType(buffer);

      if (!imageType) {
        return reply.status(400).send({
          message: 'รองรับเฉพาะรูป JPEG, PNG และ WebP',
        });
      }

      // 4. สร้าง path ที่ไม่ซ้ำกัน
      const bucket =
        process.env.SUPABASE_AVATAR_BUCKET || 'avatars';

      const filePath =
        `${userId}/${randomUUID()}.${imageType.extension}`;

      // 5. อัปโหลดไป Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: imageType.mime,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        request.log.error(
          { err: uploadError },
          'Avatar upload failed',
        );

        return reply.status(502).send({
          message: 'ไม่สามารถอัปโหลดรูปไปยัง Storage ได้',
        });
      }

      // 6. สร้าง URL ของรูป
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;

      // 7. บันทึก URL ลงฐานข้อมูล
      const [updatedUser] = await db
        .update(users)
        .set({ avatarUrl })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        // ไม่พบ user: ลบไฟล์ที่เพิ่งอัปโหลดเพื่อลดไฟล์ตกค้าง
        await supabase.storage
          .from(bucket)
          .remove([filePath]);

        return reply.status(404).send({
          message: 'ไม่พบผู้ใช้งาน',
        });
      }

      // 8. ส่งข้อมูลกลับในรูปแบบที่หน้า Profile ใช้
      return reply.send({
        id: updatedUser.id,
        name: updatedUser.displayName,
        username:
          updatedUser.username ||
          updatedUser.email.split('@')[0] ||
          'user',
        email: updatedUser.email,
        friendCode: getOrGenerateFriendCode(
          updatedUser.id,
          updatedUser.friendCode,
        ),
        avatar: updatedUser.avatarUrl || DEFAULT_AVATAR,
      });
    } catch (err: any) {
      if (
        err?.code === 'FST_REQ_FILE_TOO_LARGE' ||
        err?.statusCode === 413
      ) {
        return reply.status(413).send({
          message: 'รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB',
        });
      }

      request.log.error(err);

      return reply.status(500).send({
        message: 'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้',
      });
    }
  });

  // GET /api/user-status
  // Response: { "2026-10-19": "green" }
  fastify.get('/user-status', async (request: any, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    try {
      const userId = request.user.userId;

      const rows = await db
        .select({
          date: userDateStatuses.date,
          status: userDateStatuses.status,
        })
        .from(userDateStatuses)
        .where(eq(userDateStatuses.userId, userId));

      const result: Record<string, UserStatus> = {};

      for (const row of rows) {
        result[row.date] = row.status as UserStatus;
      }

      return reply.send(result);
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        message: 'ไม่สามารถดึงสถานะรายวันได้',
      });
    }
  });

  // POST /api/user-status
  // Body: { date: "2026-10-19", status: "green" }
  // status: null จะลบสถานะที่กำหนดเองของวันนั้น
  fastify.post('/user-status', async (request: any, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    try {
      const userId = request.user.userId;

      const body = (request.body ?? {}) as {
        date?: unknown;
        status?: unknown;
      };

      const { date, status } = body;

      if (!isValidDate(date)) {
        return reply.status(400).send({
          message: 'รูปแบบวันที่ไม่ถูกต้อง ต้องเป็น YYYY-MM-DD',
        });
      }

      if (status !== null && !isValidStatus(status)) {
        return reply.status(400).send({
          message: 'สถานะต้องเป็น green, orange, red หรือ null',
        });
      }

      if (status === null) {
        await db
          .delete(userDateStatuses)
          .where(
            and(
              eq(userDateStatuses.userId, userId),
              eq(userDateStatuses.date, date),
            ),
          );

        return reply.send({
          success: true,
          date,
          status: null,
        });
      }

      await db
        .insert(userDateStatuses)
        .values({
          userId,
          date,
          status,
        })
        .onConflictDoUpdate({
          target: [
            userDateStatuses.userId,
            userDateStatuses.date,
          ],
          set: {
            status,
            updatedAt: new Date(),
          },
        });

      return reply.send({
        success: true,
        date,
        status,
      });
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        message: 'ไม่สามารถบันทึกสถานะรายวันได้',
      });
    }
  });
}
