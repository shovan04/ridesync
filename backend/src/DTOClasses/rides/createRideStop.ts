import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export default class CreateRideStopDTO {
    @IsString()
    @IsNotEmpty({ message: "Ride ID is required" })
    public rideId!: string;

    @IsString()
    @IsNotEmpty({ message: "Title is required" })
    public title!: string;

    @IsString()
    @IsNotEmpty({ message: "Stop type is required" })
    public stopType!: "fuel" | "food" | "rest" | "tea" | "other";

    @IsString()
    @IsNotEmpty({ message: "Stop point location is required" })
    public stopPoint!: string;

    @IsNumber()
    @IsNotEmpty({ message: "Latitude is required" })
    public latitude!: number;

    @IsNumber()
    @IsNotEmpty({ message: "Longitude is required" })
    public longitude!: number;

    @IsNumber()
    @IsNotEmpty({ message: "Stop order is required" })
    public stopOrder!: number;
}
