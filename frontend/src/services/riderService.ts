import { api } from "./api";
import type { Rider } from "../types/rider";

export const getRiders = async (): Promise<Rider[]> => {
  const res = await api.get("/riders");
  return res.data;
};