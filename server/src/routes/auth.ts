import bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { users } from '../db/schema';

export async function authRoutes(fastify: FastifyInstance) {
  // 1. POST /api/auth/register
  fastify.post('/register', async (request, reply) => {
    const { email, password, displayName, username } = request.body as any;

    if (!email || !password || !displayName || !username) {
      return reply.status(400).send({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3) {
      return reply.status(400).send({
        message: 'Username ต้องมีความยาวอย่างน้อย 3 ตัวอักษร (ใช้อักษรภาษาอังกฤษ ตัวเลข และ _ ได้เท่านั้น)',
      });
    }

    // ตรวจสอบ Email หรือ Username ซ้ำ
    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.email, cleanEmail), eq(users.username, cleanUsername)))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].email === cleanEmail) {
        return reply.status(400).send({ message: 'Email นี้ถูกใช้งานแล้ว' });
      }
      return reply.status(400).send({ message: 'Username นี้ถูกใช้งานแล้ว' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const tempId = crypto.randomUUID();
    const friendCode = `FC-${tempId.slice(0, 6).toUpperCase()}`;

    const [newUser] = await db
      .insert(users)
      .values({
        email: cleanEmail,
        username: cleanUsername,
        displayName: cleanName,
        passwordHash,
        friendCode,
      })
      .returning();

    const token = fastify.jwt.sign({ userId: newUser.id, email: newUser.email });

    return reply.status(201).send({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        name: newUser.displayName,
        displayName: newUser.displayName,
        friendCode: newUser.friendCode,
        avatar: newUser.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        avatarUrl: newUser.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      },
    });
  });

  // 2. POST /api/auth/login (รองรับ Login ด้วย Email หรือ Username)
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      return reply.status(400).send({ message: 'กรุณากรอก Email/Username และ Password' });
    }

    const cleanInput = email.trim().toLowerCase();

    // ค้นหาผู้ใช้จากทั้ง Email หรือ Username
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, cleanInput), eq(users.username, cleanInput)))
      .limit(1);

    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ message: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง' });
    }

    const token = fastify.jwt.sign({ userId: user.id, email: user.email });

    const derivedUsername = user.username || user.email.split('@')[0];
    const derivedFriendCode = user.friendCode || `FC-${user.id.slice(0, 6).toUpperCase()}`;

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: derivedUsername,
        name: user.displayName,
        displayName: user.displayName,
        friendCode: derivedFriendCode,
        avatar: user.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        avatarUrl: user.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      },
    });
  });

  // 3. GET /api/auth/me
  fastify.get('/me', async (request: any, reply) => {
    try {
      await request.jwtVerify();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.user.userId))
        .limit(1);

      if (!user) return reply.status(404).send({ message: 'ไม่พบผู้ใช้งาน' });

      const derivedUsername = user.username || user.email.split('@')[0];
      const derivedFriendCode = user.friendCode || `FC-${user.id.slice(0, 6).toUpperCase()}`;

      return reply.send({
        id: user.id,
        email: user.email,
        username: derivedUsername,
        name: user.displayName,
        displayName: user.displayName,
        friendCode: derivedFriendCode,
        avatar: user.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        avatarUrl: user.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      });
    } catch (err) {
      return reply.status(401).send({ message: 'Unauthorized Token' });
    }
  });

  // 4. POST /api/auth/forgot-password
  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = request.body as any;
    if (!email) return reply.status(400).send({ message: 'กรุณาระบุอีเมล' });

    return reply.send({
      message: 'ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณเรียบร้อยแล้ว',
    });
  });
}