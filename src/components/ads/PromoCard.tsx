"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdEntry } from "@/lib/types";

interface PromoCardProps {
  placement: AdEntry["placement"];
  className?: string;
}

export function PromoCard({ placement, className = "" }: PromoCardProps) {
  const [ad, setAd] = useState<AdEntry | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("ads_manager")
      .select("*")
      .eq("placement", placement)
      .eq("active", true)
      .order("priority", { ascending: false })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        // 우선순위 가중치 랜덤: priority 높을수록 확률 높음
        const total = data.reduce((sum, d) => sum + (d.priority || 1), 0);
        let rand = Math.random() * total;
        for (const d of data) {
          rand -= d.priority || 1;
          if (rand <= 0) { setAd(d); return; }
        }
        setAd(data[0]);
      });
  }, [placement]);

  if (!ad) return null;

  if (ad.banner_url) {
    return (
      <a
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`block max-w-md mx-auto glass rounded-2xl overflow-hidden hover:border-gbus-primary/30 transition-all duration-300 border-glow group ${className}`}
      >
        <div className="relative overflow-hidden">
          <img
            src={ad.banner_url}
            alt={ad.title}
            className="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11px] text-white/90 font-semibold">{ad.app_name}</span>
              <span className="text-[8px] text-white/40 bg-white/10 px-1 py-px rounded-full font-medium uppercase tracking-wider">ad</span>
            </div>
            <p className="text-xs font-bold text-white leading-tight">{ad.title}</p>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={ad.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`block max-w-md mx-auto glass rounded-2xl p-4 hover:border-gbus-primary/30 transition-all duration-300 border-glow ${className}`}
    >
      <div className="flex items-center gap-3">
        {ad.img_url && (
          <img src={ad.img_url} alt={ad.app_name} className="w-10 h-10 rounded-xl" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gbus-primary font-semibold">{ad.app_name}</span>
            <span className="text-[9px] text-gbus-text-dim bg-gbus-surface-light/40 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider">ad</span>
          </div>
          <p className="text-sm font-semibold mt-0.5">{ad.title}</p>
          <p className="text-xs text-gbus-text-muted">{ad.description}</p>
        </div>
      </div>
    </a>
  );
}
