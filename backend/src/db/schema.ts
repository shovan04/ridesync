import {
  integer,
  pgTable,
  varchar,
  timestamp,
  uuid,
  text,
  pgEnum,
  uniqueIndex,
  index,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


export const roleEnum = pgEnum("role", ["marshal", "rider"]);
export const stopTypeEnum = pgEnum("stop_type", ["fuel", "food", "rest", "tea", "other"]);

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),

  name: text().notNull(),
  age: integer().notNull(),

  phone: varchar({ length: 15 }).notNull().unique(),
  email: varchar({ length: 255 }).notNull().unique(),
  emergencyContact: varchar({ length: 15 }).notNull(),

  address: varchar({ length: 255 }).notNull(),
  bloodGroup: varchar({ length: 4 }).notNull(),
  gender: varchar({ length: 10 }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const rides = pgTable("rides", {
  id: uuid().defaultRandom().primaryKey(),

  // public shareable ride code (6-char)
  code: varchar("code", { length: 6 }).notNull().unique(),

  startPoint: varchar({ length: 150 }).notNull(),
  endPoint: varchar({ length: 150 }).notNull(),

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
    // prevent duplicate users in same ride
    uniqueRideUser: uniqueIndex("unique_ride_user").on(
      table.rideId,
      table.userId
    ),

    // only one marshal per ride
    oneMarshalPerRide: uniqueIndex("one_marshal_per_ride")
      .on(table.rideId)
      .where(sql`role = 'marshal'`),

    // performance indexes
    rideIdx: index("ride_participants_ride_idx").on(table.rideId),
    userIdx: index("ride_participants_user_idx").on(table.userId),
  })
);

//   RIDE STOPS

export const rideStops = pgTable(
  "ride_stops",
  {
    id: uuid().defaultRandom().primaryKey(),

    rideId: uuid("ride_id")
      .notNull()
      .references(() => rides.id),

    title: varchar({ length: 60 }).notNull(),
    stopType: stopTypeEnum().notNull(),

    stopPoint: varchar({ length: 150 }).notNull(),

    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),

    stopOrder: integer("stop_order").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // ensure unique order per ride
    uniqueStopOrder: uniqueIndex("unique_stop_order_per_ride").on(
      table.rideId,
      table.stopOrder
    ),
  })
);


//   RIDE LOCATION HISTORY

export const rideLocationHistory = pgTable(
  "ride_location_history",
  {
    id: uuid().defaultRandom().primaryKey(),

    rideId: uuid("ride_id")
      .notNull()
      .references(() => rides.id),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),

    speed: integer("speed"),

    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (table) => ({
    rideIdx: index("ride_history_ride_idx").on(table.rideId),
    userIdx: index("ride_history_user_idx").on(table.userId),
  })
);