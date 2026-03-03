"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_TABS = [
  { href: "/admin/users", label: "유저 관리" },
  { href: "/admin/nicknames", label: "닉네임 변경" },
  { href: "/admin/reports", label: "신고 관리" },
  { href: "/admin/ads", label: "광고 관리" },
] as const;

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
      {ADMIN_TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
              isActive
                ? "bg-gbus-primary text-white shadow-[0_2px_12px_rgba(108,92,231,0.3)]"
                : "glass text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/60"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
