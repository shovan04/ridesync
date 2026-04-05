import db from "../db/index.js";
import { rideParticipants, rides, roleEnum, rideStops } from "../db/schema.js";
import CreateRideData from "../interfaces/createRide.interface.js";
import { eq } from "drizzle-orm";

export default class RideRepo {

    async doesRideIDExist(rideID: string) {
        const ride = await db.query.rides.findFirst({
            where: (t, { eq }) => eq(t.code, rideID),
        });

        return !!ride;
    }

    async createRide(ride: CreateRideData) {
        const [newRide] = await db.insert(rides).values(ride).returning();
        const [rideLeader] = await db.insert(rideParticipants).values({
            rideId: newRide!.id,
            userId: ride.userId,
            role: "marshal"
        }).returning();

        return { newRide, rideLeader };
    }

    async getRideByCode(rideCode: string) {
        return await db.query.rides.findFirst({
            where: (t, { eq }) => eq(t.code, rideCode),
        });
    }

    async getRideById(rideId: string) {
        return await db.query.rides.findFirst({
            where: eq(rides.id, rideId),
        });
    }

    async startRide(rideId: string) {
        const [updated] = await db.update(rides)
            .set({ status: 'active' })
            .where(eq(rides.id, rideId))
            .returning();
        return updated;
    }

    async getParticipantCount(rideId: string): Promise<number> {
        const result = await db.query.rideParticipants.findMany({
            where: (t, { eq }) => eq(t.rideId, rideId),
        });
        return result.length;
    }

    async joinRide(rideId: string, userId: string) {
        const [participant] = await db.insert(rideParticipants).values({
            rideId,
            userId,
            role: "rider"
        }).returning();
        return participant;
    }

    async createRideStop(stopData: {
        rideId: string;
        title: string;
        stopType: "fuel" | "food" | "rest" | "tea" | "other";
        stopPoint: string;
        latitude: string;
        longitude: string;
        stopOrder: number;
    }) {
        const [newStop] = await db.insert(rideStops).values(stopData).returning();
        return newStop;
    }

    async getRideStops(rideId: string) {
        return await db.query.rideStops.findMany({
            where: (t, { eq }) => eq(t.rideId, rideId),
            orderBy: (t, { asc }) => asc(t.stopOrder),
        });
    }

    async deleteRideStop(stopId: string) {
        const { eq } = require('drizzle-orm');
        const deleted = await db.delete(rideStops)
            .where(eq(rideStops.id, stopId))
            .returning();
        return deleted[0];
    }
 
    async addRideLeader(){}
}
