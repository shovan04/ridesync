import { api } from "./api";
import type { ApiResponse } from "../types/api";
import type { User, CreateUserPayload } from "../types/user";

export const createUser = async (payload: CreateUserPayload) => {
  const res = await api.post<ApiResponse<User[]>>("/user", payload);
  return res.data.data[0];
};

