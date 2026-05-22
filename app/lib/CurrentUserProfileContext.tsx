"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCurrentUserPhotoFromApi,
  normalizeUserId,
  USER_PROFILE_PHOTO_UPDATED_EVENT,
  type ProfilePhotoUpdatedDetail,
} from "./profilePhoto";

type CurrentUserProfileContextValue = {
  userId: string;
  photoDataUrl: string;
  photoVersion: number;
  syncProfile: (userId: string, photoDataUrl: string) => void;
  refreshPhoto: () => Promise<void>;
};

const CurrentUserProfileContext = createContext<CurrentUserProfileContextValue | null>(null);

export function CurrentUserProfileProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoVersion, setPhotoVersion] = useState(0);

  const applyPhoto = useCallback((nextUserId: string, nextPhoto: string) => {
    const id = normalizeUserId(nextUserId);
    const photo = String(nextPhoto || "").trim();
    if (id) setUserId(id);
    setPhotoDataUrl(photo);
    setPhotoVersion((v) => v + 1);
  }, []);

  const syncProfile = useCallback(
    (nextUserId: string, nextPhoto: string) => {
      applyPhoto(nextUserId, nextPhoto);
    },
    [applyPhoto],
  );

  const refreshPhoto = useCallback(async () => {
    try {
      const fresh = await fetchCurrentUserPhotoFromApi();
      applyPhoto(fresh.userId, fresh.photoDataUrl);
    } catch {
      // Not signed in or profile unavailable — keep existing state.
    }
  }, [applyPhoto]);

  useEffect(() => {
    void refreshPhoto();
  }, [refreshPhoto]);

  useEffect(() => {
    const onPhotoUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ProfilePhotoUpdatedDetail>).detail;
      const id = normalizeUserId(detail?.userId);
      if (!id) return;
      applyPhoto(id, detail.photoDataUrl || "");
    };
    window.addEventListener(USER_PROFILE_PHOTO_UPDATED_EVENT, onPhotoUpdated);
    return () => window.removeEventListener(USER_PROFILE_PHOTO_UPDATED_EVENT, onPhotoUpdated);
  }, [applyPhoto]);

  const value = useMemo(
    () => ({
      userId,
      photoDataUrl,
      photoVersion,
      syncProfile,
      refreshPhoto,
    }),
    [userId, photoDataUrl, photoVersion, syncProfile, refreshPhoto],
  );

  return <CurrentUserProfileContext.Provider value={value}>{children}</CurrentUserProfileContext.Provider>;
}

export function useCurrentUserProfile(): CurrentUserProfileContextValue {
  const ctx = useContext(CurrentUserProfileContext);
  if (!ctx) {
    throw new Error("useCurrentUserProfile must be used within CurrentUserProfileProvider");
  }
  return ctx;
}
