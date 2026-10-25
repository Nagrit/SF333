
import {
    and,
    eq,
    gt,
    isNotNull,
    lte,
    sql,
} from 'drizzle-orm';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

import { db, pool } from '../db';
import {
    appointmentMembers,
    appointmentReminderDeliveries,
    appointments,
    notifications,
    userPushTokens,
} from '../db/schema';

const expo = new Expo();

const GRACE_MINUTES = 10;

const REMINDERS = [
    {
        type: '1day' as const,
        offsetMs: 24 * 60 * 60 * 1000,
        label: '24 ชั่วโมง',
    },
    {
        type: '2hours' as const,
        offsetMs: 2 * 60 * 60 * 1000,
        label: '2 ชั่วโมง',
    },
];

async function main() {
    const now = new Date();
    const dryRun = process.env.DRY_RUN === 'true';
    console.log(
        `[Reminder Job] mode=${dryRun ? 'DRY_RUN' : 'LIVE'}, now=${now.toISOString()}`,
    );
    const graceMs = GRACE_MINUTES * 60 * 1000;

    const upcoming = await db
        .select()
        .from(appointments)
        .where(
            and(
                eq(appointments.status, 'confirmed'),
                eq(appointments.notifyEnabled, true),
                isNotNull(appointments.startAt),
                gt(appointments.startAt, now),
                lte(
                    appointments.startAt,
                    new Date(now.getTime() + 24 * 60 * 60 * 1000 + graceMs),
                ),
            ),
        );

    let inAppCreated = 0;
    let pushAccepted = 0;
    let errors = 0;

    for (const appointment of upcoming) {
        const startAt = appointment.startAt;

        if (!startAt) continue;

        const members = await db
            .select({ userId: appointmentMembers.userId })
            .from(appointmentMembers)
            .where(
                and(
                    eq(appointmentMembers.appointmentId, appointment.id),
                    eq(appointmentMembers.status, 'accepted'),
                ),
            );

        const recipientIds = [
            ...new Set([
                appointment.creatorId,
                ...members.map((member) => member.userId),
            ]),
        ];

        for (const reminder of REMINDERS) {
            const scheduledFor = new Date(
                startAt.getTime() - reminder.offsetMs,
            );

            if (scheduledFor > now) continue;

            for (const userId of recipientIds) {
                try {
                    // ค้นหารายการเดิมก่อน เพื่อให้ Retry Push ได้
                    // แม้เลยช่วง GRACE_MINUTES ไปแล้ว
                    let [delivery] = await db
                        .select()
                        .from(appointmentReminderDeliveries)
                        .where(
                            and(
                                eq(
                                    appointmentReminderDeliveries.appointmentId,
                                    appointment.id,
                                ),
                                eq(appointmentReminderDeliveries.userId, userId),
                                eq(
                                    appointmentReminderDeliveries.reminderType,
                                    reminder.type,
                                ),
                                eq(
                                    appointmentReminderDeliveries.scheduledFor,
                                    scheduledFor,
                                ),
                            ),
                        )
                        .limit(1);

                    if (!delivery) {
                        // สร้างรายการใหม่ได้เฉพาะเมื่อถึงเวลา
                        // และยังไม่เลยช่วงเวลาผ่อนผัน
                        if (now.getTime() - scheduledFor.getTime() > graceMs) {
                            continue;
                        }

                        if (dryRun) {
                            console.log(
                                `[DRY_RUN] Would create reminder: appointment=${appointment.id}, user=${userId}, type=${reminder.type}, scheduledFor=${scheduledFor.toISOString()}`,
                            );
                            continue;
                        }

                        const [created] = await db
                            .insert(appointmentReminderDeliveries)
                            .values({
                                appointmentId: appointment.id,
                                userId,
                                reminderType: reminder.type,
                                scheduledFor,
                            })
                            .onConflictDoNothing()
                            .returning();

                        if (created) {
                            delivery = created;
                        } else {
                            // อาจมี Cron อีกตัวสร้างรายการเดียวกันไปแล้ว
                            [delivery] = await db
                                .select()
                                .from(appointmentReminderDeliveries)
                                .where(
                                    and(
                                        eq(
                                            appointmentReminderDeliveries.appointmentId,
                                            appointment.id,
                                        ),
                                        eq(appointmentReminderDeliveries.userId, userId),
                                        eq(
                                            appointmentReminderDeliveries.reminderType,
                                            reminder.type,
                                        ),
                                        eq(
                                            appointmentReminderDeliveries.scheduledFor,
                                            scheduledFor,
                                        ),
                                    ),
                                )
                                .limit(1);
                        }
                    }

                    if (!delivery) continue;

                    const message =
                        `นัดหมาย "${appointment.title}" จะเริ่มในอีก ${reminder.label}`;


                    if (dryRun) {
                        console.log(
                            `[DRY_RUN] Existing reminder: appointment=${appointment.id}, user=${userId}, type=${reminder.type}, inAppSent=${Boolean(delivery.inAppSentAt)}, pushSent=${Boolean(delivery.pushSentAt)}`,
                        );
                        continue;
                    }
                    // In-app: ทำรายการและบันทึกสถานะใน Transaction เดียวกัน
                    if (!delivery.inAppSentAt) {
                        await db.transaction(async (tx) => {
                            const [current] = await tx
                                .select()
                                .from(appointmentReminderDeliveries)
                                .where(
                                    eq(appointmentReminderDeliveries.id, delivery.id),
                                )
                                .for('update');

                            if (!current || current.inAppSentAt) return;

                            await tx.insert(notifications).values({
                                userId,
                                title: 'ใกล้ถึงเวลานัดหมาย',
                                message,
                                type: 'appointment_reminder',
                                data: JSON.stringify({
                                    appointmentId: appointment.id,
                                    reminderType: reminder.type,
                                }),
                            });

                            await tx
                                .update(appointmentReminderDeliveries)
                                .set({ inAppSentAt: new Date() })
                                .where(
                                    eq(
                                        appointmentReminderDeliveries.id,
                                        delivery.id,
                                    ),
                                );

                            inAppCreated++;
                        });
                    }

                    // อ่านสถานะล่าสุดก่อนตัดสินใจส่ง Push
                    const [currentDelivery] = await db
                        .select()
                        .from(appointmentReminderDeliveries)
                        .where(
                            eq(appointmentReminderDeliveries.id, delivery.id),
                        )
                        .limit(1);

                    if (!currentDelivery || currentDelivery.pushSentAt) {
                        continue;
                    }

                    const tokens = await db
                        .select()
                        .from(userPushTokens)
                        .where(
                            and(
                                eq(userPushTokens.userId, userId),
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

                    // ไม่มี Token: เก็บสถานะ Push ไว้ให้ลองใหม่ใน Cron รอบหน้า
                    if (validTokens.length === 0) continue;

                    const messages: ExpoPushMessage[] = validTokens.map(
                        (token) => ({
                            to: token,
                            sound: 'default',
                            title: 'ใกล้ถึงเวลานัดหมาย',
                            body: message,
                            data: {
                                type: 'appointment_reminder',
                                appointmentId: appointment.id,
                                reminderType: reminder.type,
                            },
                        }),
                    );

                    const tickets = [];

                    for (const chunk of expo.chunkPushNotifications(messages)) {
                        const chunkTickets =
                            await expo.sendPushNotificationsAsync(chunk);

                        tickets.push(...chunkTickets);
                    }

                    const accepted = tickets.filter(
                        (ticket) => ticket.status === 'ok',
                    ).length;

                    const failed = tickets.filter(
                        (ticket) => ticket.status === 'error',
                    );

                    if (accepted === tickets.length && tickets.length > 0) {
                        await db
                            .update(appointmentReminderDeliveries)
                            .set({
                                pushSentAt: new Date(),
                                lastError: null,
                                attempts: sql`${appointmentReminderDeliveries.attempts} + 1`,
                            })
                            .where(
                                eq(appointmentReminderDeliveries.id, delivery.id),
                            );

                        pushAccepted++;
                    } else {
                        const errorMessage = failed
                            .map((ticket) =>
                                ticket.status === 'error'
                                    ? ticket.message
                                    : '',
                            )
                            .filter(Boolean)
                            .join('; ');

                        await db
                            .update(appointmentReminderDeliveries)
                            .set({
                                attempts: sql`${appointmentReminderDeliveries.attempts} + 1`,
                                lastError:
                                    errorMessage ||
                                    `Push accepted ${accepted}/${tickets.length} tokens`,
                            })
                            .where(
                                eq(appointmentReminderDeliveries.id, delivery.id),
                            );

                        errors++;
                    }
                } catch (error) {
                    errors++;

                    console.error(
                        'Appointment reminder error:',
                        appointment.id,
                        userId,
                        reminder.type,
                        error,
                    );
                }
            }
        }
    }

    console.log(
        JSON.stringify({
            completedAt: now.toISOString(),
            appointmentsChecked: upcoming.length,
            inAppCreated,
            pushAccepted,
            errors,
        }),
    );
}

main()
    .catch((error) => {
        console.error('Appointment reminder job failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
