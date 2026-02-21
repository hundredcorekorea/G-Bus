"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Reservation, BusSession } from "@/lib/types";

export function useRealtimeQueue(sessionId: string) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [session, setSession] = useState<BusSession | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [sessionRes, reservationsRes] = await Promise.all([
      supabase.from("bus_sessions").select("*").eq("id", sessionId).single(),
      supabase
        .from("reservations")
        .select("*, user:users(nickname, game_nickname)")
        .eq("session_id", sessionId)
        .order("queue_no", { ascending: true }),
    ]);

    if (sessionRes.data) setSession(sessionRes.data);
    if (reservationsRes.data) setReservations(reservationsRes.data);
    setLoading(false);
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // 변경 감지 시 전체 재조회 (간단한 전략)
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bus_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new as BusSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  return { session, reservations, loading, refetch: fetchData };
}
