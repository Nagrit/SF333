CREATE TABLE "appointment_members" (
	"appointment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_members_appointment_id_user_id_pk" PRIMARY KEY("appointment_id","user_id"),
	CONSTRAINT "appointment_members_status_check" CHECK ("appointment_members"."status" IN ('pending', 'accepted', 'declined'))
);
--> statement-breakpoint
CREATE TABLE "appointment_poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"label" text NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"location" text,
	"place_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_poll_votes" (
	"option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_poll_votes_option_id_user_id_pk" PRIMARY KEY("option_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "appointment_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"kind" varchar(30) DEFAULT 'general' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_polls_kind_check" CHECK ("appointment_polls"."kind" IN ('general', 'date', 'time', 'place', 'activity'))
);
--> statement-breakpoint
ALTER TABLE "appointment_members" ADD CONSTRAINT "appointment_members_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_members" ADD CONSTRAINT "appointment_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_poll_options" ADD CONSTRAINT "appointment_poll_options_poll_id_appointment_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."appointment_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_poll_votes" ADD CONSTRAINT "appointment_poll_votes_option_id_appointment_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."appointment_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_poll_votes" ADD CONSTRAINT "appointment_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_polls" ADD CONSTRAINT "appointment_polls_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;