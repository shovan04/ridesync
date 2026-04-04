export interface User {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  emergencyContact: string;
  address: string;
  bloodGroup: string;
  gender: string;
}

export interface CreateUserPayload {
  name: string;
  age: number;
  email: string;
  phone: string;
  emergencyContact: string;
  address: string;
  bloodGroup: string;
  gender: string;
}