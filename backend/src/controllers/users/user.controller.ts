import { Request, Response } from "express";
import { ResponseDTO } from "../../DTOClasses/response.DTO.js";
import HttpResponseCode from "../../constants/httpResponseCode.js";
import CreateUserData from "../../interfaces/createUser.interface.js";

export default class UserController {

    public static async createUser(req: Request, res: Response) {
        const data:CreateUserData = await req.body;

        const resD = new ResponseDTO<CreateUserData>();
        resD.setStatus(true);
        resD.setMessage("User created successfully");
        resD.setData(data);

        return res.status(HttpResponseCode.CREATED).json(resD);
    }
}
