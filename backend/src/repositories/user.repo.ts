import db from "../db/index.js";
import CreateUserData from "../interfaces/createUser.interface.js";
import { users } from "../db/schema.js";

export default class UserRepo {
    
    async doesUserExist(user: CreateUserData) {
        return db.query.users.findFirst({
            where: (t, { or, eq }) =>
                or(
                    eq(t.email, user.email),
                    eq(t.phone, user.phone)
                ),
        });
    }
    async createUser(user: CreateUserData) {
        return await db.insert(users).values(user).execute();
    }
}
