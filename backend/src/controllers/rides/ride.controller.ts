import { Request, Response } from "express";
import CreateRideDTO from "../../DTOClasses/rides/createRides.js";
import RideService from "../../services/ride/createRide.service.js";
import { ResponseDTO } from "../../DTOClasses/response.DTO.js";
import ErrorResponseDTO from "../../DTOClasses/errorResponse.DTO.js";
import HttpResponseCode from "../../constants/httpResponseCode.js";
import { CreateRideResponse } from "../../interfaces/createRide.interface.js";
import JoinRideDTO from "../../DTOClasses/rides/joinRide.js";
import JoinRideService from "../../services/ride/joinRide.service.js";

export default class RideController {
    public static async createRide(req: Request, res: Response) {
        try {
            const data: CreateRideDTO = req.body;

            const newRide = await new RideService().createRide(data);

            const rideRes = new ResponseDTO<CreateRideResponse>();
            rideRes.setStatus(true);
            rideRes.setMessage("Ride created successfully")
            rideRes.setData(newRide)
            
            res.status(HttpResponseCode.CREATED).json(rideRes)
        } catch (error: any & Error) {
            const errRes = new ResponseDTO<ErrorResponseDTO>();
            errRes.setStatus(false);
            errRes.setMessage("FAILD_CREATION");
            errRes.setData(new ErrorResponseDTO(req.baseUrl, HttpResponseCode.BAD_REQUEST, error.message));
            return res.status(HttpResponseCode.BAD_REQUEST).json(errRes);
        }
    }

    public static async joinRide(req: Request, res: Response) {
        try {
            const data: JoinRideDTO = req.body;

            const result = await new JoinRideService().joinRide(data);

            const rideRes = new ResponseDTO();
            rideRes.setStatus(true);
            rideRes.setMessage("Successfully joined the ride");
            rideRes.setData(result);
            
            res.status(HttpResponseCode.OK).json(rideRes);
        } catch (error: any & Error) {
            const errRes = new ResponseDTO<ErrorResponseDTO>();
            errRes.setStatus(false);
            errRes.setMessage("JOIN_RIDE_FAILED");
            errRes.setData(new ErrorResponseDTO(req.baseUrl, HttpResponseCode.CONFLICT, error.message));
            return res.status(HttpResponseCode.CONFLICT).json(errRes);
        }
    }
}