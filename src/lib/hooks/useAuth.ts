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
    let mounted = true;

    const loadProfiles = async (userId: string) => {
      if (cachedUserId === userId && cachedProfile) {
        if (mounted) {
          setProfile(cachedProfile);
          setHcProfile(cachedHcProfile);
        }
        return;
      }

      try {
        const [{ data: gBusProfile }, { data: hcData }] = await Promise.all([
          supabase.from("users").select("*").eq("id", userId).single(),
          supabase.from("hc_profiles").select("*").eq("id", userId).single(),
        ]);

        cachedUserId = userId;
        cachedProfile = gBusProfile;
        cachedHcProfile = hcData;
        if (mounted) {
          setProfile(gBusProfile);
          setHcProfile(hcData);
        }
      } catch {
        // 프로필 로드 실패 시 무시 (loading은 finally에서 처리)
      }
    };

    // onAuthStateChange가 INITIAL_SESSION을 즉시 발생시킴 → 별도 init 불필요
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log("[G-BUS] auth event:", event, "hasSession:", !!session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
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

        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, hcProfile, loading };
}
