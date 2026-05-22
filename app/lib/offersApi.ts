import { apiGetJson, apiPatchJson } from "./api";

export type OfferStatus = "pending" | "accepted" | "rejected";

export type ClientOffer = {
  id: string;
  postId: string;
  postTitle: string;
  freelancerId: string;
  freelancerName: string;
  clientId: string;
  message: string;
  rate?: string;
  status: OfferStatus;
  createdAt: string;
  freelancerPhotoDataUrl?: string;
};

export async function fetchClientOffers(): Promise<ClientOffer[]> {
  const data = await apiGetJson<{ offers: ClientOffer[] }>("/api/offers/mine");
  return data.offers || [];
}

export async function acceptClientOffer(offerId: string): Promise<ClientOffer> {
  const data = await apiPatchJson<{ offer: ClientOffer; message: string }>(
    `/api/offers/${encodeURIComponent(offerId)}/accept`,
    {},
  );
  return data.offer;
}

export async function rejectClientOffer(offerId: string): Promise<ClientOffer> {
  const data = await apiPatchJson<{ offer: ClientOffer; message: string }>(
    `/api/offers/${encodeURIComponent(offerId)}/reject`,
    {},
  );
  return data.offer;
}

export function isOfferPending(status: OfferStatus | string | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  return !value || value === "pending";
}

export async function completeClientTask(taskId: string) {
  return apiPatchJson<{ message: string; post: { id: string; hireStatus?: string; reviewSubmittedAt?: string } }>(
    `/api/tasks/${encodeURIComponent(taskId)}/complete`,
    {},
  );
}

export async function submitTaskReview(taskId: string, input: { rating: number; text: string }) {
  return apiPatchJson<{ message: string; post: { id: string; reviewSubmittedAt?: string } }>(
    `/api/tasks/${encodeURIComponent(taskId)}/review`,
    { rating: input.rating, text: input.text },
  );
}
