import { Router, Request, Response } from "express";
import { WellcomeRoutes } from "../configs/routes/wellcome.js";
import wellcomeRoutes from "./hello/wellcome.js";
import { UsersRoutes } from "../configs/routes/users.js";
import UserRouter from "./users/route.js";

const mainRouter = Router();

mainRouter.get("/", (req: Request, res: Response): void => {
  res.send("API is running... Go to /hello/wellcome to see the wellcome message.");
});

mainRouter.use(WellcomeRoutes.BASE_PATH, wellcomeRoutes)
mainRouter.use(UsersRoutes.BASE_PATH, UserRouter)

export default mainRouter;

