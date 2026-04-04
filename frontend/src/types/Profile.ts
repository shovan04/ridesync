export type BloodGroup =
  | "A+" | "A-" | "B+" | "B-" 
  | "O+" | "O-" | "AB+" | "AB-" 
  | null;

export interface ProfileData {
  name: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  bloodGroup: BloodGroup;
  emergencyName: string;
  emergencyPhone: string;
}