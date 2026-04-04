import { IsNotEmpty, IsString } from "class-validator";

export default class CreateRideDTO {
    @IsString()
    @IsNotEmpty({ message: "userID is required" })
    public userId!: string;

    @IsString()
    @IsNotEmpty({ message: "Start point is required" })
    public startPoint!: string;

    @IsString()
    @IsNotEmpty({ message: "End point is required" })
    public endPoint!: string;

}