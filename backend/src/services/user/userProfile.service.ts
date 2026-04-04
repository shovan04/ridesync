import UserRepo from "../../repositories/user.repo.js";
import UserProfileResponseDTO from "../../DTOClasses/users/userProfile.js";

export default class UserProfileService {
    public async getUserProfile(userId: string): Promise<UserProfileResponseDTO> {
        const user = await new UserRepo().getUserById(userId);
        
        if (!user) {
            throw new Error("User not found");
        }

        const profile: UserProfileResponseDTO = {
            id: user.id,
            name: user.name,
            age: user.age,
            phone: user.phone,
            email: user.email,
            emergencyContact: user.emergencyContact,
            address: user.address,
            bloodGroup: user.bloodGroup,
            gender: user.gender,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        return profile;
    }
}
