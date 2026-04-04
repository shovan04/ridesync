import { Request, Response } from "express";
import { ResponseDTO } from "../../DTOClasses/response.DTO.js";
import HttpResponseCode from "../../constants/httpResponseCode.js";
import CreateUserData from "../../interfaces/createUser.interface.js";
import ErrorResponseDTO from "../../DTOClasses/errorResponse.DTO.js";
import UserService from "../../services/user/createUser.service.js";

export default class UserController {

    public static async createUser(req: Request, res: Response) {
        try {
            const data: CreateUserData = await req.body;

            const newUser = await new UserService().createUser(data);
            const resD = new ResponseDTO();
            resD.setStatus(true);
            resD.setMessage("User created successfully");
            resD.setData(newUser);

            return res.status(HttpResponseCode.CREATED).json(resD);
        } catch (error: any & Error) {
            const errRes = new ResponseDTO<ErrorResponseDTO>();
            errRes.setStatus(false);
            errRes.setMessage("FAILD_CREATION");
            errRes.setData(new ErrorResponseDTO(req.baseUrl, HttpResponseCode.CONFLICT, error.message));
            return res.status(HttpResponseCode.CONFLICT).json(errRes);
        }

    }
}
