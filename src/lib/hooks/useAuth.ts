"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User, HCProfile } from "@/lib/types";

// 모듈 레벨 캐시 (SPA 내 페이지 이동 시 재사용)
let cachedProfile: User | null = null;
let cachedHcProfile: HCProfile | null = null;
let cachedUserId: string | null = null;

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(cachedProfile);
  const [hcProfile, setHcProfile] = useState<HCProfile | null>(cachedHcProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const loadProfiles = async (userId: string) => {
      if (cachedUserId === userId && cachedProfile) {
        setProfile(cachedProfile);
        setHcProfile(cachedHcProfile);
        return;
      }

      const [{ data: gBusProfile }, { data: hcData }] = await Promise.all([
        supabase.from("users").select("*").eq("id", userId).single(),
        supabase.from("hc_profiles").select("*").eq("id", userId).single(),
      ]);

      cachedUserId = userId;
      cachedProfile = gBusProfile;
      cachedHcProfile = hcData;
      setProfile(gBusProfile);
      setHcProfile(hcData);
    };

    // onAuthStateChange가 INITIAL_SESSION을 즉시 발생시킴 → 별도 init 불필요
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            // 로그인/토큰 갱신 시 캐시 무효화
            cachedUserId = null;
            cachedProfile = null;
          }
          await loadProfiles(currentUser.id);
        } else {
          cachedUserId = null;
          cachedProfile = null;
          cachedHcProfile = null;
          setProfile(null);
          setHcProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, hcProfile, loading };
}
