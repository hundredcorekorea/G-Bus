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
}

export const DUNGEONS: DungeonConfig[] = [
  { name: "로스메키이", partySize: 4, barrackMinCount: 30 },
  { name: "로스메키이노", partySize: 4, barrackMinCount: 30 },
  { name: "메키이", partySize: 4, barrackMinCount: 30 },
  { name: "키노", partySize: 4, barrackMinCount: 12 },
  { name: "네버랜드", partySize: 4, barrackMinCount: 12 },
  { name: "다크웹", partySize: 2, barrackMinCount: 20 },
];

// 글 타입 라벨
export const POST_TYPE_LABEL = {
  party: "파티 모집",
  bus: "승객 모집",
  barrack_bus: "배럭 모집",
} as const;
