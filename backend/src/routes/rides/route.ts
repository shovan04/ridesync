import { Router } from "express";
import RideRoutes from "../../configs/routes/rides.js";
import { validateDto } from "../../middlewares/validateDTOs.js";
import CreateRideDTO from "../../DTOClasses/rides/createRides.js";
import JoinRideDTO from "../../DTOClasses/rides/joinRide.js";
import CreateRideStopDTO from "../../DTOClasses/rides/createRideStop.js";
import RideController from "../../controllers/rides/ride.controller.js";


const rideRouter = Router();

rideRouter.post(RideRoutes.CREATE_RIDE, validateDto(CreateRideDTO), RideController.createRide)
rideRouter.post(RideRoutes.JOIN_RIDE, validateDto(JoinRideDTO), RideController.joinRide)
rideRouter.post(RideRoutes.START_RIDE, RideController.startRide)
rideRouter.get(RideRoutes.GET_RIDE_BY_CODE, RideController.getRideByCode)
rideRouter.post(RideRoutes.ADD_STOP, validateDto(CreateRideStopDTO), RideController.addRideStop)
rideRouter.get(RideRoutes.GET_STOPS, RideController.getRideStops)
rideRouter.delete(RideRoutes.DELETE_STOP, RideController.deleteRideStop)
rideRouter.get('/participants/:rideId', RideController.getRideParticipants)


export default rideRouter;