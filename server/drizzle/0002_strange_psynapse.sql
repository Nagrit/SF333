CREATE TABLE "appointment_reminder_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reminder_type" varchar(20) NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"in_app_sent_at" timestamp with time zone,
	"push_sent_at" timestamp with time zone,
	"attempts" numeric(6, 0) DEFAULT '0' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_reminder_delivery_unique" UNIQUE("appointment_id","user_id","reminder_type","scheduled_for"),
	CONSTRAINT "appointment_reminder_type_check" CHECK ("appointment_reminder_deliveries"."reminder_type" IN ('1day', '2hours'))
);
--> statement-breakpoint
CREATE TABLE "user_push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" varchar(20),
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "appointment_reminder_deliveries" ADD CONSTRAINT "appointment_reminder_deliveries_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_reminder_deliveries" ADD CONSTRAINT "appointment_reminder_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_push_tokens" ADD CONSTRAINT "user_push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;