CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"group_id" uuid,
	"title" varchar(200) NOT NULL,
	"category" varchar(20) NOT NULL,
	"location" text,
	"budget" numeric(12, 2),
	"topic" text,
	"meeting_mode" varchar(20),
	"meeting_link" text,
	"trip_type" varchar(20),
	"accommodation" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"start_date" date,
	"end_date" date,
	"duration" text,
	"notes" text,
	"recurring" varchar(20) DEFAULT 'none' NOT NULL,
	"app_decide" boolean DEFAULT true NOT NULL,
	"vote_enabled" boolean DEFAULT true NOT NULL,
	"is_vote" boolean DEFAULT false NOT NULL,
	"status_text" varchar(100),
	"notify_enabled" boolean DEFAULT true NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_category_check" CHECK ("appointments"."category" IN ('food', 'trip', 'work', 'personal')),
	CONSTRAINT "app_meeting_mode_check" CHECK ("appointments"."meeting_mode" IN ('online', 'inperson')),
	CONSTRAINT "app_trip_type_check" CHECK ("appointments"."trip_type" IN ('day', 'multi')),
	CONSTRAINT "app_recurring_check" CHECK ("appointments"."recurring" IN ('none', 'daily', 'weekly', 'monthly')),
	CONSTRAINT "app_status_check" CHECK ("appointments"."status" IN ('pending', 'confirmed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "friend_group_members" (
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friend_group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id"),
	CONSTRAINT "group_role_check" CHECK ("friend_group_members"."role" IN ('owner', 'admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE "friend_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"icon" varchar(50) DEFAULT 'laptop' NOT NULL,
	"allow_member_invite" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friends" (
	"user_id" uuid NOT NULL,
	"friend_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friends_user_id_friend_id_pk" PRIMARY KEY("user_id","friend_id"),
	CONSTRAINT "friends_status_check" CHECK ("friends"."status" IN ('pending', 'accepted', 'blocked')),
	CONSTRAINT "friends_no_self_check" CHECK ("friends"."user_id" <> "friends"."friend_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) DEFAULT 'general' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_date_statuses" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" varchar(20) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_date_statuses_user_id_date_pk" PRIMARY KEY("user_id","date"),
	CONSTRAINT "user_date_statuses_status_check" CHECK ("user_date_statuses"."status" IN ('green', 'orange', 'red'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"username" varchar(50),
	"email" varchar(255) NOT NULL,
	"friend_code" varchar(20),
	"avatar_url" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_group_id_friend_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."friend_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_group_members" ADD CONSTRAINT "friend_group_members_group_id_friend_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."friend_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_group_members" ADD CONSTRAINT "friend_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_groups" ADD CONSTRAINT "friend_groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_date_statuses" ADD CONSTRAINT "user_date_statuses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;