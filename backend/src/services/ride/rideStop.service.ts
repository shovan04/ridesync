import RideRepo from "../../repositories/ride.repo.js";
import CreateRideStopDTO from "../../DTOClasses/rides/createRideStop.js";
import RideStopResponseDTO from "../../DTOClasses/rides/rideStopResponse.js";

export default class RideStopService {
    private repo = new RideRepo();

    /**
     * Add a stop to a ride
     */
    public async addStop(stopData: CreateRideStopDTO): Promise<RideStopResponseDTO> {
        // Verify ride exists
        const ride = await this.repo.getRideByCode(stopData.rideId);
        if (!ride) {
            throw new Error("Ride not found");
        }

        // Check if stop order already exists for this ride
        const existingStops = await this.repo.getRideStops(stopData.rideId);
        const duplicateOrder = existingStops.find(s => s.stopOrder === stopData.stopOrder);
        
        if (duplicateOrder) {
            throw new Error(`Stop order ${stopData.stopOrder} already exists for this ride`);
        }

        // Create the stop (convert numbers to strings for numeric DB fields)
        const newStop = await this.repo.createRideStop({
            rideId: stopData.rideId,
            title: stopData.title,
            stopType: stopData.stopType,
            stopPoint: stopData.stopPoint,
            latitude: stopData.latitude.toString(),
            longitude: stopData.longitude.toString(),
            stopOrder: stopData.stopOrder,
        });

        if (!newStop) {
            throw new Error("Failed to create ride stop");
        }

        // Convert to response DTO
        return this.mapToResponse(newStop);
    }

    /**
     * Get all stops for a ride
     */
    public async getRideStops(rideId: string): Promise<RideStopResponseDTO[]> {
        const stops = await this.repo.getRideStops(rideId);
        
        return stops.map(stop => this.mapToResponse(stop));
    }

    /**
     * Delete a ride stop
     */
    public async deleteStop(stopId: string): Promise<RideStopResponseDTO> {
        const deletedStop = await this.repo.deleteRideStop(stopId);
        
        if (!deletedStop) {
            throw new Error("Stop not found or already deleted");
        }

        return this.mapToResponse(deletedStop);
    }

    /**
     * Map database result to response DTO
     */
    private mapToResponse(stop: any): RideStopResponseDTO {
        return {
            id: stop.id,
            rideId: stop.rideId,
            title: stop.title,
            stopType: stop.stopType,
            stopPoint: stop.stopPoint,
            latitude: parseFloat(stop.latitude),
            longitude: parseFloat(stop.longitude),
            stopOrder: stop.stopOrder,
            createdAt: stop.createdAt,
        };
    }
}
