export interface User {
  id: string;
  nickname: string;
  game_nickname: string;
  game_server: string | null;
  verified: boolean;
  is_admin: boolean;
  honor_score: number;
  noshow_count: number;
  hc_account_id: string | null;
  created_at: string;
}

export interface BusSession {
  id: string;
  driver_id: string;
  title: string;
  dungeon_name: string;
  min_count: number;
  current_count: number;
  round: number;
  status: "waiting" | "running" | "completed" | "cancelled";
  avg_round_minutes: number;
  created_at: string;
  updated_at: string;
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
