import { apiGetJson } from "./api";

export type FreelancerReview = {
  reviewer: string;
  text: string;
  rating: number;
};

export type PublicFreelancerProfile = {
  id: string;
  name: string;
  photoDataUrl: string;
  course: string;
  yearLevel: string;
  headline: string;
  bio: string;
  reviews: FreelancerReview[];
};

export function freelancerProfilePath(freelancerId: string) {
  return `/freelancers/${encodeURIComponent(freelancerId)}`;
}

export async function fetchPublicFreelancerProfile(freelancerId: string): Promise<PublicFreelancerProfile> {
  const data = await apiGetJson<{ profile: PublicFreelancerProfile }>(
    `/api/users/${encodeURIComponent(freelancerId)}/freelancer-profile`,
  );
  return data.profile;
}
