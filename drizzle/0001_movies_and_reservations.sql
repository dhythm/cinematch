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
CREATE TABLE "reservations" (
	"event_id" text PRIMARY KEY NOT NULL,
	"theater" text NOT NULL,
	"showtime" text,
	"note" text,
	"reserved_by" text,
	"reserved_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;