import { Router } from "express";
import { UsersRoutes } from "../../configs/routes/users.js";
import { validateDto } from "../../middlewares/validateDTOs.js";
import CreateUserDTO from "../../DTOClasses/users/createUser.js";

const userRouter = Router();

userRouter.post(UsersRoutes.CREATE_USER, validateDto(CreateUserDTO), )

export default userRouter;
