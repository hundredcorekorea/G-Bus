"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [gameNickname, setGameNickname] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("파일 크기는 5MB 이하여야 합니다.");
      return;
    }
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  const handleSignup = async () => {
    if (!nickname.trim() || !gameNickname.trim()) {
      setError("닉네임과 인게임 닉네임은 필수입니다.");
      return;
    }
    if (!screenshot) {
      setError("인게임 프로필 스크린샷을 업로드해 주세요.");
      return;
    }
    setLoading(true);
    setError("");

    // 1. 회원가입
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // 2. 스크린샷 업로드
      const ext = screenshot.name.split(".").pop() || "png";
      const filePath = `${data.user.id}/profile.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-screenshots")
        .upload(filePath, screenshot, { upsert: true });

      if (uploadError) {
        setError("스크린샷 업로드 실패: " + uploadError.message);
        setLoading(false);
        return;
      }

      // 3. 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from("profile-screenshots")
        .getPublicUrl(filePath);

      // 4. 프로필 생성
      const { error: profileError } = await supabase.from("users").insert({
        id: data.user.id,
        nickname: nickname.trim(),
        game_nickname: gameNickname.trim(),
        profile_screenshot_url: urlData.publicUrl,
      });

      if (profileError) {
        setError("프로필 생성 실패: " + profileError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/pending");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleSignup();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-3xl font-bold text-gbus-primary">G-BUS</span>
        </Link>

        <div className="bg-gbus-surface border border-gbus-border rounded-xl p-6">
          {/* 탭 */}
          <div className="flex mb-6 bg-gbus-bg rounded-lg p-1">
            <button
              type="button"
              className={`flex-1 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                mode === "login"
                  ? "bg-gbus-primary text-white"
                  : "text-gbus-text-muted hover:text-gbus-text"
              }`}
              onClick={() => { setMode("login"); setError(""); }}
            >
              로그인
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                mode === "signup"
                  ? "bg-gbus-primary text-white"
                  : "text-gbus-text-muted hover:text-gbus-text"
              }`}
              onClick={() => { setMode("signup"); setError(""); }}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              minLength={6}
              required
            />

            {mode === "signup" && (
              <>
                <Input
                  label="닉네임"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="G-BUS에서 사용할 닉네임"
                  required
                />
                <Input
                  label="인게임 대표 닉네임"
                  value={gameNickname}
                  onChange={(e) => setGameNickname(e.target.value)}
                  placeholder="게임 내 캐릭터 닉네임"
                  required
                />

                {/* 스크린샷 촬영 튜토리얼 */}
                <div className="bg-gbus-bg rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-2">인게임 프로필 스크린샷 촬영 방법</h4>
                  <ol className="text-xs text-gbus-text-muted space-y-1.5 list-decimal list-inside">
                    <li>게임에 접속하여 <strong className="text-gbus-text">프로필 화면</strong>을 엽니다</li>
                    <li>캐릭터 닉네임이 보이는 상태에서 스크린샷을 촬영합니다</li>
                    <li className="pl-4 list-none">
                      <span className="inline-flex items-center gap-1.5 mt-1 flex-wrap">
                        <kbd className="px-1.5 py-0.5 bg-gbus-surface border border-gbus-border rounded text-[10px] font-mono">Print Screen</kbd>
                        <span className="text-gbus-text-dim">전체 화면 캡처</span>
                      </span>
                    </li>
                    <li className="pl-4 list-none">
                      <span className="inline-flex items-center gap-1.5 mt-1 flex-wrap">
                        <kbd className="px-1.5 py-0.5 bg-gbus-surface border border-gbus-border rounded text-[10px] font-mono">Win</kbd>
                        <span className="text-gbus-text-dim">+</span>
                        <kbd className="px-1.5 py-0.5 bg-gbus-surface border border-gbus-border rounded text-[10px] font-mono">Shift</kbd>
                        <span className="text-gbus-text-dim">+</span>
                        <kbd className="px-1.5 py-0.5 bg-gbus-surface border border-gbus-border rounded text-[10px] font-mono">S</kbd>
                        <span className="text-gbus-text-dim">영역 선택 캡처</span>
                      </span>
                    </li>
                    <li>아래 업로드 버튼으로 스크린샷을 첨부합니다</li>
                  </ol>
                </div>

                {/* 스크린샷 업로드 */}
                <div>
                  <label className="text-sm font-medium text-gbus-text-muted block mb-1.5">
                    프로필 스크린샷 <span className="text-gbus-danger">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {screenshotPreview ? (
                    <div className="relative">
                      <img
                        src={screenshotPreview}
                        alt="프로필 스크린샷 미리보기"
                        className="w-full rounded-lg border border-gbus-border max-h-48 object-contain bg-gbus-bg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshot(null);
                          setScreenshotPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 w-6 h-6 bg-gbus-danger/80 hover:bg-gbus-danger text-white rounded-full text-xs flex items-center justify-center cursor-pointer"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-gbus-border rounded-lg hover:border-gbus-primary transition-colors cursor-pointer flex flex-col items-center gap-2"
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gbus-text-dim">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="text-sm text-gbus-text-muted">클릭하여 스크린샷 업로드</span>
                      <span className="text-xs text-gbus-text-dim">PNG, JPG (최대 5MB)</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-gbus-danger bg-gbus-danger/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              {mode === "login" ? "로그인" : "회원가입"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
