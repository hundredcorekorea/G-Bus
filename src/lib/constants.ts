export const DISCORD_INVITE_URL =
  process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "https://discord.gg/gbus";

export const MIN_BUS_COUNT = 20;

export const NOSHOW_PENALTY_SCORE = 10;

export const QUEUE_ALERT_BEFORE = 3; // 내 순번 N개 전에 알림

// 던전 목록 및 설정
export interface DungeonConfig {
  name: string;
  partySize: number;         // 파티 모집 인원
  barrackMinCount: number;   // 배럭 모집 기본 인원
  minDigiLv: number;         // 하인 최소 레벨 (0 = 제한 없음)
}

export const DUNGEONS: DungeonConfig[] = [
  { name: "로어", partySize: 4, barrackMinCount: 0, minDigiLv: 150 },
  { name: "스던", partySize: 4, barrackMinCount: 0, minDigiLv: 150 },
  { name: "메청", partySize: 4, barrackMinCount: 0, minDigiLv: 150 },
  { name: "키이", partySize: 4, barrackMinCount: 0, minDigiLv: 150 },
  { name: "메키이", partySize: 4, barrackMinCount: 30, minDigiLv: 150 },
  { name: "키노", partySize: 4, barrackMinCount: 24, minDigiLv: 160 },
  { name: "다크웹", partySize: 2, barrackMinCount: 20, minDigiLv: 150 },
  { name: "네버", partySize: 4, barrackMinCount: 15, minDigiLv: 160 },
  { name: "사성수노말", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
  { name: "사성수어려움", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
  { name: "판노", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
  { name: "판어", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
];

// 포지션 정의
export const POSITIONS = {
  dealer: { label: "딜러", color: "danger" as const },
  support: { label: "유틸", color: "accent" as const },
  healer: { label: "힐러", color: "success" as const },
} as const;
export type Position = keyof typeof POSITIONS;

// 신고 카테고리
export const REPORT_CATEGORIES = {
  noshow: "노쇼/잠수",
  fraud: "사기/먹튀",
  abuse: "욕설/비매너",
  cheat: "핵/버그 악용",
  other: "기타",
} as const;
export type ReportCategory = keyof typeof REPORT_CATEGORIES;

// 글 타입 라벨
export const POST_TYPE_LABEL = {
  party: "파티 모집",
  bus: "승객 모집",
  barrack_bus: "배럭 모집",
} as const;
