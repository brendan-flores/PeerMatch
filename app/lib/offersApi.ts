import { apiGetJson, apiPatchJson } from "./api";
import { mapFeedPosts } from "./communityPosts";
import type { CommunityPost } from "./postsStorage";

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

export type ClientOffersPayload = {
  offers: ClientOffer[];
  posts: CommunityPost[];
};

export type TaskPostPatch = Pick<
  CommunityPost,
  | "id"
  | "hireStatus"
  | "reviewSubmittedAt"
  | "reviewRating"
  | "reviewText"
  | "assignedFreelancerId"
  | "assignedFreelancerName"
  | "completedAt"
>;

export async function fetchClientOffers(): Promise<ClientOffersPayload> {
  const data = await apiGetJson<{ offers: ClientOffer[]; posts?: CommunityPost[] }>(
    "/api/offers/mine",
  );
  return {
    offers: data.offers || [],
    posts: mapFeedPosts(data.posts),
  };
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
  return apiPatchJson<{ message: string; post: TaskPostPatch }>(
    `/api/tasks/${encodeURIComponent(taskId)}/complete`,
    {},
  );
}

export async function submitTaskReview(taskId: string, input: { rating: number; text: string }) {
  return apiPatchJson<{ message: string; post: TaskPostPatch }>(
    `/api/tasks/${encodeURIComponent(taskId)}/review`,
    { rating: input.rating, text: input.text },
  );
}
