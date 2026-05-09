import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookings1778097000000 implements MigrationInterface {
  name = 'AddBookings1778097000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Booking-type fields on listings
    await queryRunner.query(
      `ALTER TABLE "listings"
        ADD COLUMN "booking_type" varchar(16) NOT NULL DEFAULT 'long_term',
        ADD COLUMN "daily_rate" numeric(14,2),
        ADD COLUMN "weekly_rate" numeric(14,2),
        ADD COLUMN "minimum_stay" integer NOT NULL DEFAULT 1,
        ADD COLUMN "available_from" DATE,
        ADD COLUMN "available_to" DATE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_listings_booking_type" ON "listings" ("booking_type")`,
    );

    // 2) Bookings table
    await queryRunner.query(
      `CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT '1',
        "listing_id" uuid NOT NULL,
        "guest_id" uuid NOT NULL,
        "host_id" uuid NOT NULL,
        "check_in" DATE NOT NULL,
        "check_out" DATE NOT NULL,
        "nights" integer NOT NULL,
        "total_amount" numeric(14,2) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "moyasar_payment_id" varchar(64),
        "notes" text,
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bookings_listing"
          FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bookings_guest"
          FOREIGN KEY ("guest_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bookings_host"
          FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_listing" ON "bookings" ("listing_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_guest" ON "bookings" ("guest_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_host" ON "bookings" ("host_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_status" ON "bookings" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_dates" ON "bookings" ("check_in", "check_out")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_dates"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_host"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_guest"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_listing"`);
    await queryRunner.query(`DROP TABLE "bookings"`);

    await queryRunner.query(`DROP INDEX "public"."idx_listings_booking_type"`);
    await queryRunner.query(
      `ALTER TABLE "listings"
        DROP COLUMN "available_to",
        DROP COLUMN "available_from",
        DROP COLUMN "minimum_stay",
        DROP COLUMN "weekly_rate",
        DROP COLUMN "daily_rate",
        DROP COLUMN "booking_type"`,
    );
  }
}
