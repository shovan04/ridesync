import { Router } from "express";
import { UsersRoutes } from "../../configs/routes/users.js";
import { validateDto } from "../../middlewares/validateDTOs.js";
import CreateUserDTO from "../../DTOClasses/users/createUser.js";
import UserController from "../../controllers/users/user.controller.js";

const userRouter = Router();

userRouter.post(UsersRoutes.CREATE_USER, validateDto(CreateUserDTO), UserController.createUser)

export default userRouter;
