import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys not configured");
  webPush.setVapidDetails("mailto:osu355@gmail.com", publicKey, privateKey);
  vapidConfigured = true;
}

export async function POST(req: NextRequest) {
  try {
    ensureVapid();

    const { userId, title, body, tag, url } = await req.json();
    if (!userId || !title) {
      return NextResponse.json({ error: "userId and title required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const payload = JSON.stringify({ title, body, tag, url });
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(async (err) => {
          // 410 Gone or 404: 구독 만료 → DB에서 삭제
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          throw err;
        }),
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ sent });
  } catch {
    return NextResponse.json({ error: "Push send failed" }, { status: 500 });
  }
}
