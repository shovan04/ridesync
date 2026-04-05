import type { BloodGroup, ProfileData } from "../types/Profile";

export const BLOOD_GROUPS: BloodGroup[] = [
  "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"
];

export const defaultProfile: ProfileData = {
  name: "Md Yousuf",
  age: "",
  email: "",
  gender: "male",
  phone: "",
  address: "",
  bloodGroup: null,
  emergencyName: "",
  emergencyPhone: "",
};