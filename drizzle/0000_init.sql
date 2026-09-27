CREATE TABLE "candidates" (
	"event_id" text NOT NULL,
	"id" text NOT NULL,
	"date" date NOT NULL,
	"slot" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "candidates_event_id_id_pk" PRIMARY KEY("event_id","id"),
	CONSTRAINT "candidates_slot_check" CHECK ("candidates"."slot" in ('morning', 'noon', 'evening', 'late'))
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"movie" jsonb NOT NULL,
	"title" text NOT NULL,
	"organizer" text,
	"memo" text,
	"deadline" date,
	"decided_candidate_id" text,
	"organizer_key_hash" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"release_date" date NOT NULL,
	"runtime" integer,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"poster" text NOT NULL,
	"distributor" text,
	"synopsis" text DEFAULT '' NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"event_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"comment" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer GENERATED ALWAYS AS IDENTITY (sequence name "participants_position_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	CONSTRAINT "participants_event_id_id_pk" PRIMARY KEY("event_id","id")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"event_id" text PRIMARY KEY NOT NULL,
	"theater" text NOT NULL,
	"showtime" text,
	"note" text,
	"reserved_by" text,
	"reserved_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;