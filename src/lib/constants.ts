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
  // 경험치팟
  { name: "아포", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
  { name: "파드", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
  { name: "카영레", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
  // 필드/기타
  { name: "필드파티", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
  { name: "프론티어", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
  { name: "카이저의영역", partySize: 4, barrackMinCount: 0, minDigiLv: 0 },
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

// 익명 기사 별명 (세션 ID 기반 결정적 선택)
const ANON_ADJECTIVES = [
  "부끄러워하는", "졸린", "신나는", "배고픈", "용감한",
  "수줍은", "느긋한", "씩씩한", "장난꾸러기", "멋쟁이",
  "귀여운", "당당한", "조용한", "활발한", "든든한",
  "재빠른", "점잖은", "엉뚱한", "다정한", "호기심많은",
] as const;
const ANON_ANIMALS = [
  "라이언", "판다", "펭귄", "고양이", "강아지",
  "토끼", "여우", "곰", "다람쥐", "부엉이",
  "코알라", "수달", "햄스터", "사슴", "돌고래",
  "알파카", "치타", "거북이", "앵무새", "해달",
] as const;

/** 세션 ID 기반 결정적 익명 별명 생성 (같은 세션은 항상 같은 별명) */
export function getAnonymousName(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash + sessionId.charCodeAt(i)) | 0;
  }
  const adj = ANON_ADJECTIVES[Math.abs(hash) % ANON_ADJECTIVES.length];
  const animal = ANON_ANIMALS[Math.abs(hash >> 8) % ANON_ANIMALS.length];
  return `${adj} ${animal}`;
}
