export interface User {
  id: string;
  nickname: string;
  game_nickname: string;
  profile_screenshot_url: string | null;
  verified: boolean;
  barrack_verified: boolean;
  upper_dungeon_verified: boolean;
  upper_field_verified: boolean;
  driver_verified: boolean;
  tamer_lv: number;
  digi_lv: number;
  is_admin: boolean;
  is_moderator: boolean;
  is_influencer: boolean;
  honor_score: number;
  noshow_count: number;
  hc_account_id: string | null;
  suspended_until: string | null;
  admin_memo: string | null;
  created_at: string;
}

export type PostType = "party" | "bus" | "barrack_bus" | "field_party" | "exp_party" | "mass_bus";

export type PriceType = "fixed" | "auction";

export interface BusSession {
  id: string;
  driver_id: string;
  host_user_id: string | null;
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
  host?: User;
  bids?: Bid[];
}

export interface DriverApplication {
  id: string;
  session_id: string;
  driver_id: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  // joined
  driver?: User;
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
  positions: string[] | null;
  tamer_lv: number | null;
  digi_lv: number | null;
  is_beginner: boolean;
  status: "pending" | "waiting" | "called" | "done" | "noshow";
  created_at: string;
  // joined
  user?: User;
}

export interface Barrack {
  id: string;
  user_id: string;
  char_name: string;
  tamer_lv: number | null;
  digi_lv: number | null;
  sort_order: number;
  created_at: string;
}

export interface AdEntry {
  id: string;
  app_name: string;
  title: string;
  description: string;
  img_url: string | null;
  banner_url: string | null;
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

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  session_id: string | null;
  category: string;
  reason: string;
  status: "pending" | "reviewed" | "warned" | "actioned" | "dismissed";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  // joined
  reporter?: User;
  reported?: User;
}

export interface SessionDriver {
  id: string;
  session_id: string;
  user_id: string;
  role: "main" | "sub";
  revenue_share_pct: number;
  created_at: string;
  // joined
  user?: User;
}

export type NoticeCategory = "notice" | "event" | "update";

export interface Notice {
  id: string;
  author_id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  pinned: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  // joined
  author?: User;
}

export interface NicknameChangeRequest {
  id: string;
  user_id: string;
  old_nickname: string;
  new_nickname: string;
  field: "nickname" | "game_nickname";
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  // joined
  user?: User;
}

export interface FieldIncomeRecord {
  id: string;
  user_id: string;
  dungeon_name: string;
  earned_t: number;
  start_t: number | null;
  end_t: number | null;
  memo: string | null;
  recorded_date: string;
  created_at: string;
}

export interface DriverCustomer {
  id: string;
  driver_id: string;
  customer_id: string;
  nickname: string;
  note: string | null;
  rating: number | null;
  session_count: number;
  last_session_at: string | null;
  created_at: string;
  customer?: User;
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
