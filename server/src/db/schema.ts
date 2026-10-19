import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// 1. Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  username: varchar('username', { length: 50 }).unique(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  friendCode: varchar('friend_code', { length: 20 }),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});


export const userDateStatuses = pgTable(
  'user_date_statuses',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.date] }),
    check(
      'user_date_statuses_status_check',
      sql`${table.status} IN ('green', 'orange', 'red')`
    ),
  ]
);


// 2. Friends
export const friends = pgTable(
  'friends',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.friendId] }),
    check('friends_status_check', sql`${table.status} IN ('pending', 'accepted', 'blocked')`),
    check('friends_no_self_check', sql`${table.userId} <> ${table.friendId}`),
  ]
);

// 3. Friend Groups
export const friendGroups = pgTable('friend_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  icon: varchar('icon', { length: 50 }).default('laptop').notNull(),
  allowMemberInvite: boolean('allow_member_invite').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const friendGroupMembers = pgTable(
  'friend_group_members',
  {
    groupId: uuid('group_id').notNull().references(() => friendGroups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).default('member').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    check('group_role_check', sql`${table.role} IN ('owner', 'admin', 'member')`),
  ]
);

// Aliases เพื่อให้ย้อนหลังสอดคล้องกับ imports จากไฟล์ routes
export const groups = friendGroups;
export const groupMembers = friendGroupMembers;

// 4. Appointments
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').references(() => friendGroups.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    category: varchar('category', { length: 20 }).notNull(),
    location: text('location'),
    budget: numeric('budget', { precision: 12, scale: 2 }),
    topic: text('topic'),
    meetingMode: varchar('meeting_mode', { length: 20 }),
    meetingLink: text('meeting_link'),
    tripType: varchar('trip_type', { length: 20 }),
    accommodation: text('accommodation'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    startDate: date('start_date'),
    endDate: date('end_date'),
    duration: text('duration'),
    notes: text('notes'),
    recurring: varchar('recurring', { length: 20 }).default('none').notNull(),
    appDecide: boolean('app_decide').default(true).notNull(),
    voteEnabled: boolean('vote_enabled').default(true).notNull(),
    isVote: boolean('is_vote').default(false).notNull(),
    statusText: varchar('status_text', { length: 100 }),
    notifyEnabled: boolean('notify_enabled').default(true).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check('app_category_check', sql`${table.category} IN ('food', 'trip', 'work', 'personal')`),
    check('app_meeting_mode_check', sql`${table.meetingMode} IN ('online', 'inperson')`),
    check('app_trip_type_check', sql`${table.tripType} IN ('day', 'multi')`),
    check('app_recurring_check', sql`${table.recurring} IN ('none', 'daily', 'weekly', 'monthly')`),
    check('app_status_check', sql`${table.status} IN ('pending', 'confirmed', 'cancelled')`),
  ]
);

// 5. Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).default('general').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  data: text('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});