import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import 'dotenv/config';
import Fastify from 'fastify';

import multipart from '@fastify/multipart';
import { appointmentRoutes } from './routes/appointments';
import { authRoutes } from './routes/auth';
import { friendRoutes } from './routes/friends';
import { groupRoutes } from './routes/groups';
import { notificationRoutes } from './routes/notifications';
import { userRoutes } from './routes/user';

// 1. เพิ่ม ignoreTrailingSlash เพื่อป้องกันปัญหา 404 จาก trailing slash (/)
const fastify = Fastify({
  logger: true,
  ignoreTrailingSlash: true
});

// 2. แก้ปัญหา Fastify ฟ้อง Error 400 เมื่อ Client ส่ง Content-Type: application/json แต่ไม่มี Body (เช่น DELETE request)
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
  try {
    const json = body && body.trim() ? JSON.parse(body) : {};
    done(null, json);
  } catch (err: any) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

const start = async () => {
  try {

    await fastify.register(cors, {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    });

    await fastify.register(multipart, {
      limits: {
        files: 1,
        fields: 0,
        fileSize: 5 * 1024 * 1024, // 5 MB
      },
    });

    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(userRoutes, { prefix: '/api/user' });
    await fastify.register(groupRoutes, { prefix: '/api/groups' });
    await fastify.register(appointmentRoutes, { prefix: '/api/appointments' });
    await fastify.register(friendRoutes, { prefix: '/api/friends' });
    await fastify.register(notificationRoutes, { prefix: '/api/notifications' });

    // ย้าย prefix '/api' มาไว้ล่างสุดของกลุ่ม /api เพื่อป้องกันการดักจับ URL ซ้ำซ้อน
    await fastify.register(userRoutes, { prefix: '/api' });

    // Health Check Endpoint
    fastify.get('/health', async () => {
      return { status: 'ok', message: 'Server is running!' };
    });

    const port = Number(process.env.PORT) || 4000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();