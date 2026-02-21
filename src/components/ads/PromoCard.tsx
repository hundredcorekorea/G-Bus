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
      .limit(1)
      .single()
      .then(({ data }) => setAd(data));
  }, [placement]);

  if (!ad) return null;

  return (
    <a
      href={ad.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-gradient-to-r from-gbus-primary/10 to-gbus-accent/10 border border-gbus-border rounded-xl p-4 hover:border-gbus-primary transition-colors ${className}`}
    >
      <div className="flex items-center gap-3">
        {ad.img_url && (
          <img src={ad.img_url} alt={ad.app_name} className="w-10 h-10 rounded-lg" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gbus-primary font-medium">{ad.app_name}</span>
            <span className="text-[10px] text-gbus-text-dim">AD</span>
          </div>
          <p className="text-sm font-medium">{ad.title}</p>
          <p className="text-xs text-gbus-text-muted">{ad.description}</p>
        </div>
      </div>
    </a>
  );
}
