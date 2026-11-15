"use client";

import { useEffect } from "react";
import type { PublicUser } from "@/lib/api/types";
import { useAppDispatch } from "@/store/hooks";
import { userLoaded } from "@/store/slices/auth";

/** Puts the server-fetched user into Redux for client components (renders nothing). */
export function AuthHydrator({ user }: { user: PublicUser }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(userLoaded(user));
  }, [dispatch, user]);

  return null;
}
