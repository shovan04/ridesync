import { Router } from "express";
import RideRoutes from "../../configs/routes/rides.js";
import { validateDto } from "../../middlewares/validateDTOs.js";
import CreateRideDTO from "../../DTOClasses/rides/createRides.js";
import JoinRideDTO from "../../DTOClasses/rides/joinRide.js";
import RideController from "../../controllers/rides/ride.controller.js";


const rideRouter = Router();

rideRouter.post(RideRoutes.CREATE_RIDE, validateDto(CreateRideDTO), RideController.createRide)
rideRouter.post(RideRoutes.JOIN_RIDE, validateDto(JoinRideDTO), RideController.joinRide)


export default rideRouter;