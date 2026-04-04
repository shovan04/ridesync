import {
    integer,
    pgTable,
    varchar,
    timestamp,
    uuid,
    text,
    pgEnum,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["marshal", "rider"]);


//   USERS

export const users = pgTable("users", {
    id: uuid().defaultRandom().primaryKey(),

    name: text().notNull(),
    age: integer().notNull(),

    phone: varchar({ length: 15 }).notNull().unique(),
    email: varchar({ length: 255 }).notNull().unique(),

    address: varchar({ length: 255 }).notNull(),
    bloodGroup: varchar({ length: 4 }).notNull(),
    gender: varchar({ length: 10 }).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

//   RIDES

export const rides = pgTable("rides", {
    id: uuid().defaultRandom().primaryKey(),

    startPoint: varchar({ length: 150 }).notNull(),
    endPoint: varchar({ length: 150 }).notNull(),

    // better for calculations later
    distance: integer("distance_km").notNull(),
    duration: integer("duration_min").notNull(),
    overallSpeed: integer("overall_speed").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

//   RIDE PARTICIPANTS

export const rideParticipants = pgTable(
    "ride_participants",
    {
        id: uuid().defaultRandom().primaryKey(),

        rideId: uuid("ride_id")
            .notNull()
            .references(() => rides.id),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id),

        role: roleEnum().notNull(),
    },
    (table) => ({
        // prevent duplicate joins
        uniqueRideUser: uniqueIndex("unique_ride_user").on(
            table.rideId,
            table.userId
        ),

        // only ONE marshal per ride
        oneMarshalPerRide: uniqueIndex("one_marshal_per_ride")
            .on(table.rideId)
            .where(sql`role = 'marshal'`),
    })
);