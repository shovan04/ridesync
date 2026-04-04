import CreateUserData from "../../interfaces/createUser.interface.js";
import UserRepo from "../../repositories/user.repo.js";

export default class UserService {
  public async createUser(user: CreateUserData) {
        const isUserExists = await new UserRepo().doesUserExist(user);
        if (isUserExists && Object.keys(isUserExists).length > 0) {
          throw new Error("User already exists with the credintatils");
        }
        return await new UserRepo().createUser(user);
    }
}
