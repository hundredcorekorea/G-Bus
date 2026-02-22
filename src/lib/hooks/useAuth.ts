"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User, HCProfile } from "@/lib/types";

// 모듈 레벨 캐시 (SPA 내 페이지 이동 시 재사용)
let cachedUser: SupabaseUser | null = null;
let cachedProfile: User | null = null;
let cachedHcProfile: HCProfile | null = null;
let cachedUserId: string | null = null;

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(cachedUser);
  const [profile, setProfile] = useState<User | null>(cachedProfile);
  const [hcProfile, setHcProfile] = useState<HCProfile | null>(cachedHcProfile);
  const [loading, setLoading] = useState(!cachedUser);
  const profileLoadRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // 프로필 로딩을 onAuthStateChange 바깥에서 실행
    // → 토큰 갱신 데드락 방지
    const loadProfiles = async (userId: string) => {
      if (cachedUserId === userId && cachedProfile) {
        if (mounted) {
          setProfile(cachedProfile);
          setHcProfile(cachedHcProfile);
          setLoading(false);
        }
        return;
      }

      try {
        const [{ data: gBusProfile }, { data: hcData }] = await Promise.all([
          supabase.from("users").select("*").eq("id", userId).maybeSingle(),
          supabase.from("hc_profiles").select("*").eq("id", userId).maybeSingle(),
        ]);

        cachedUserId = userId;
        cachedProfile = gBusProfile;
        cachedHcProfile = hcData;
        if (mounted) {
          setProfile(gBusProfile);
          setHcProfile(hcData);
        }
      } catch {
        // 프로필 로드 실패 시 무시
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // onAuthStateChange 콜백은 동기적으로만 상태 설정
    // DB 쿼리는 콜백 바깥에서 비동기 실행 (데드락 방지)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        cachedUser = currentUser;
        setUser(currentUser);

        if (currentUser) {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            cachedUserId = null;
            cachedProfile = null;
          }
          // 프로필 로딩을 setTimeout으로 auth lock 해제 후 실행
          profileLoadRef.current = currentUser.id;
          setTimeout(() => {
            if (mounted && profileLoadRef.current === currentUser.id) {
              loadProfiles(currentUser.id);
            }
          }, 0);
        } else {
          profileLoadRef.current = null;
          cachedUserId = null;
          cachedProfile = null;
          cachedHcProfile = null;
          setProfile(null);
          setHcProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, hcProfile, loading };
}
