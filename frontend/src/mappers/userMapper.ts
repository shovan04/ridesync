import type { ProfileData } from "../types/Profile";
import type { CreateUserPayload } from "../types/user";

export const mapProfileToUser = (p: ProfileData): CreateUserPayload => {
  return {
    name: p.name,
    age: Number(p.age),
    email: "test@gmail.com",
    phone: p.phone,
    emergencyContact: p.emergencyPhone,
    address: p.address,
    bloodGroup: p.bloodGroup || "",
    gender: p.gender,
  };
};



import type { User } from "../types/user";

export const mapUserToProfile = (u: User): ProfileData => {
  return {
    name: u.name,
    age: String(u.age),
    gender: u.gender.toLowerCase(),
    phone: u.phone,
    address: u.address,
    bloodGroup: u.bloodGroup as any,
    emergencyName: "",
    emergencyPhone: u.emergencyContact,
  };
};