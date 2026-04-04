import { IsNotEmpty, IsString } from "class-validator";

export default class JoinRideDTO {
    @IsString()
    @IsNotEmpty({ message: "User ID is required" })
    public userId!: string;

    @IsString()
    @IsNotEmpty({ message: "Ride code is required" })
    public rideCode!: string;
}
