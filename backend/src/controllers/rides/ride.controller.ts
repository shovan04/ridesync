import { Request, Response } from "express";
import CreateRideDTO from "../../DTOClasses/rides/createRides.js";
import RideService from "../../services/ride/createRide.service.js";
import { ResponseDTO } from "../../DTOClasses/response.DTO.js";
import ErrorResponseDTO from "../../DTOClasses/errorResponse.DTO.js";
import HttpResponseCode from "../../constants/httpResponseCode.js";
import { CreateRideResponse } from "../../interfaces/createRide.interface.js";
import JoinRideDTO from "../../DTOClasses/rides/joinRide.js";
import JoinRideService from "../../services/ride/joinRide.service.js";
import CreateRideStopDTO from "../../DTOClasses/rides/createRideStop.js";
import RideStopService from "../../services/ride/rideStop.service.js";
import RideStopResponseDTO from "../../DTOClasses/rides/rideStopResponse.js";
import RideRepo from "../../repositories/ride.repo.js";

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

    public static async getRideByCode(req: Request, res: Response) {
        try {
            const rideCode = req.params.rideCode as string;

            if (!rideCode) {
                throw new Error("Ride code is required");
            }

            const repo = new RideRepo();
            const ride = await repo.getRideByCode(rideCode);

            if (!ride) {
                throw new Error("Ride not found");
            }

            // Get participant count
            const participantCount = await repo.getParticipantCount(ride.id);

            const rideRes = new ResponseDTO();
            rideRes.setStatus(true);
            rideRes.setMessage("Ride details retrieved successfully");
            rideRes.setData({
                rideId: ride.id,
                code: ride.code,
                startPoint: ride.startPoint,
                endPoint: ride.endPoint,
                distance: ride.distance,
                duration: ride.duration,
                overallSpeed: ride.overallSpeed,
                status: ride.status,
                participantCount,
            });
            
            res.status(HttpResponseCode.OK).json(rideRes);
        } catch (error: any & Error) {
            const errRes = new ResponseDTO<ErrorResponseDTO>();
            errRes.setStatus(false);
            errRes.setMessage("GET_RIDE_FAILED");
            errRes.setData(new ErrorResponseDTO(req.baseUrl, HttpResponseCode.NOTFOUND, error.message));
            return res.status(HttpResponseCode.NOTFOUND).json(errRes);
        }
    }

    public static async startRide(req: Request, res: Response) {
        try {
            const rideId = req.params.rideId as string;
            const { userId } = req.body;

            if (!rideId || !userId) {
                throw new Error("Ride ID and User ID are required");
            }

            const repo = new RideRepo();
            
            // Verify user is marshal
            const ride = await repo.getRideByCode(rideId);
            if (!ride) {
                throw new Error("Ride not found");
            }

            // Update ride status to active
            const updatedRide = await repo.startRide(rideId);

            const rideRes = new ResponseDTO();
            rideRes.setStatus(true);
            rideRes.setMessage("Ride started successfully");
            rideRes.setData({
                rideId: updatedRide?.id,
                status: updatedRide?.status,
            });
            
            res.status(HttpResponseCode.OK).json(rideRes);
        } catch (error: any & Error) {
            const errRes = new ResponseDTO<ErrorResponseDTO>();
            errRes.setStatus(false);
            errRes.setMessage("START_RIDE_FAILED");
            errRes.setData(new ErrorResponseDTO(req.baseUrl, HttpResponseCode.BAD_REQUEST, error.message));
            return res.status(HttpResponseCode.BAD_REQUEST).json(errRes);
        }
    }

    public static async addRideStop(req: Request, res: Response) {
        try {
            const data: CreateRideStopDTO = req.body;

            const newStop = await new RideStopService().addStop(data);

            const resD = new ResponseDTO<RideStopResponseDTO>();
            resD.setStatus(true);
            resD.setMessage("Ride stop added successfully");
            resD.setData(newStop);
            
            res.status(HttpResponseCode.CREATED).json(resD);
        } catch (error: any & Error) {
            const errRes = new ResponseDTO<ErrorResponseDTO>();
            errRes.setStatus(false);
            errRes.setMessage("ADD_STOP_FAILED");
            errRes.setData(new ErrorResponseDTO(req.baseUrl, HttpResponseCode.BAD_REQUEST, error.message));
            return res.status(HttpResponseCode.BAD_REQUEST).json(errRes);
        }
    }

    public static async getRideStops(req: Request, res: Response) {
        try {
            const rideId = req.params.rideId as string;

            if (!rideId) {
                throw new Error("Ride ID is required");
            }

            const stops = await new RideStopService().getRideStops(rideId);

            const resD = new ResponseDTO<RideStopResponseDTO[]>();
            resD.setStatus(true);
            resD.setMessage("Ride stops retrieved successfully");
            resD.setData(stops);
            
            res.status(HttpResponseCode.OK).json(resD);
        } catch (error: any & Error) {
            const errRes = new ResponseDTO<ErrorResponseDTO>();
            errRes.setStatus(false);
            errRes.setMessage("GET_STOPS_FAILED");
            errRes.setData(new ErrorResponseDTO(req.baseUrl, HttpResponseCode.NOTFOUND, error.message));
            return res.status(HttpResponseCode.NOTFOUND).json(errRes);
        }
    }

    public static async deleteRideStop(req: Request, res: Response) {
        try {
            const stopId = req.params.stopId as string;

            if (!stopId) {
                throw new Error("Stop ID is required");
            }

            const deletedStop = await new RideStopService().deleteStop(stopId);

            const resD = new ResponseDTO<RideStopResponseDTO>();
            resD.setStatus(true);
            resD.setMessage("Ride stop deleted successfully");
            resD.setData(deletedStop);
            
            res.status(HttpResponseCode.OK).json(resD);
        } catch (error: any & Error) {
            const errRes = new ResponseDTO<ErrorResponseDTO>();
            errRes.setStatus(false);
            errRes.setMessage("DELETE_STOP_FAILED");
            errRes.setData(new ErrorResponseDTO(req.baseUrl, HttpResponseCode.NOTFOUND, error.message));
            return res.status(HttpResponseCode.NOTFOUND).json(errRes);
        }
    }
}