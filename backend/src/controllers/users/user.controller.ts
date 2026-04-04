import { Request, Response } from "express";
import { ResponseDTO } from "../../DTOClasses/response.DTO.js";
import HttpResponseCode from "../../constants/httpResponseCode.js";
import CreateUserData from "../../interfaces/createUser.interface.js";
import ErrorResponseDTO from "../../DTOClasses/errorResponse.DTO.js";
import UserService from "../../services/user/createUser.service.js";
import UserProfileService from "../../services/user/userProfile.service.js";
import UserProfileResponseDTO from "../../DTOClasses/users/userProfile.js";

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

    public static async getUserProfile(req: Request, res: Response) {
        try {
            const userId = req.params.userId as string;

            if (!userId) {
                throw new Error("User ID is required");
            }

            const profile = await new UserProfileService().getUserProfile(userId);
            
            const resD = new ResponseDTO<UserProfileResponseDTO>();
            resD.setStatus(true);
            resD.setMessage("User profile retrieved successfully");
            resD.setData(profile);

            return res.status(HttpResponseCode.OK).json(resD);
        } catch (error: any & Error) {
            const errRes = new ResponseDTO<ErrorResponseDTO>();
            errRes.setStatus(false);
            errRes.setMessage("USER_NOT_FOUND");
            errRes.setData(new ErrorResponseDTO(req.baseUrl, HttpResponseCode.NOTFOUND, error.message));
            return res.status(HttpResponseCode.NOTFOUND).json(errRes);
        }
    }
}
