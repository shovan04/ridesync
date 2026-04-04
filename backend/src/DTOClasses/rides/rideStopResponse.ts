export default class RideStopResponseDTO {
    id!: string;
    rideId!: string;
    title!: string;
    stopType!: string;
    stopPoint!: string;
    latitude!: number;
    longitude!: number;
    stopOrder!: number;
    createdAt!: Date;
}
