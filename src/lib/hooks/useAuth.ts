"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User, HCProfile } from "@/lib/types";

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [hcProfile, setHcProfile] = useState<HCProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadProfiles = async (userId: string) => {
    const [{ data: gBusProfile }, { data: hcData }] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).single(),
      supabase.from("hc_profiles").select("*").eq("id", userId).single(),
    ]);
    setProfile(gBusProfile);
    setHcProfile(hcData);
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        await loadProfiles(user.id);
      }

      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfiles(session.user.id);
        } else {
          setProfile(null);
          setHcProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { user, profile, hcProfile, loading };
}
