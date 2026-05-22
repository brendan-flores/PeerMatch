import { apiGetJson } from "./api";

export type UserSearchResult = {
  id: string;
  name: string;
  photoDataUrl?: string;
};

export async function searchUsersByQuery(q: string): Promise<UserSearchResult[]> {
  const query = String(q || "").trim();
  if (!query) return [];

  const data = await apiGetJson<{ users: UserSearchResult[] }>(
    `/api/users/search?q=${encodeURIComponent(query)}`,
  );

  return data.users ?? [];
}

