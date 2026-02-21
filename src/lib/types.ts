export interface User {
  id: string;
  nickname: string;
  game_nickname: string;
  profile_screenshot_url: string | null;
  verified: boolean;
  barrack_verified: boolean;
  is_admin: boolean;
  is_moderator: boolean;
  honor_score: number;
  noshow_count: number;
  hc_account_id: string | null;
  created_at: string;
}

export type PostType = "party" | "bus" | "barrack_bus";

export type PriceType = "fixed" | "auction";

export interface BusSession {
  id: string;
  driver_id: string;
  title: string;
  dungeon_name: string;
  post_type: PostType;
  price_type: PriceType;
  min_count: number;
  current_count: number;
  round: number;
  status: "waiting" | "running" | "completed" | "cancelled";
  avg_round_minutes: number;
  price_t: number | null;
  scheduled_start: string | null;
  party_size: number | null;
  created_at: string;
  updated_at: string;
  // joined
  driver?: User;
  bids?: Bid[];
}

export interface Bid {
  id: string;
  session_id: string;
  driver_id: string;
  price_t: number;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  // joined
  driver?: User;
}

export interface Reservation {
  id: string;
  session_id: string;
  user_id: string;
  char_name: string;
  queue_no: number;
  status: "waiting" | "called" | "done" | "noshow";
  created_at: string;
  // joined
  user?: User;
}

export interface Barrack {
  id: string;
  user_id: string;
  char_name: string;
  sort_order: number;
  created_at: string;
}

export interface AdEntry {
  id: string;
  app_name: string;
  title: string;
  description: string;
  img_url: string | null;
  link: string;
  placement: "waiting" | "settlement" | "notification";
  priority: number;
  active: boolean;
  created_at: string;
}

export interface DriverRating {
  id: string;
  session_id: string;
  driver_id: string;
  rater_id: string;
  speed_score: number;
  safety_score: number;
  comment: string | null;
  created_at: string;
}

// Hundred Core 통합 인증
export interface HCProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface HCAppRegistration {
  id: string;
  user_id: string;
  app_id: string;
  registered_at: string;
  last_active_at: string;
  app_metadata: Record<string, unknown>;
}
