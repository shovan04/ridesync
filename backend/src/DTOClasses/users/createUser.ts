import { IsEmail, IsNotEmpty, IsNumber, IsString } from "class-validator";

export default class CreateUserDTO {
    @IsString()
    @IsNotEmpty({ message: "Name is required" })
    public name!: string;

    @IsNumber()
    @IsNotEmpty({ message: "Age is required" })
    public age!: number;

    @IsString()
    @IsEmail({}, { message: "Email is invalid" })
    @IsNotEmpty({ message: "Email is required" })
    public email!: string;

    @IsString()
    @IsNotEmpty({ message: "Phone is required" })
    public phone!: string;

    @IsString()
    @IsNotEmpty({ message: "Emergency Contact is required" })
    public emergencyContact!: string;

    @IsString()
    @IsNotEmpty({ message: "Address is required" })
    public address!: string;

    @IsString()
    @IsNotEmpty({ message: "Blood Group is required" })
    public bloodGroup!: string;

    @IsString()
    @IsNotEmpty({ message: "Gender is required" })
    public gender!: string;

}