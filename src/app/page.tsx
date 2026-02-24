import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4 py-16 hero-bg">
        <div className="max-w-4xl w-full text-center">
          {/* 로고 아이콘 */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gbus-primary/10 border border-gbus-primary/20 mb-10 animate-pulse-glow animate-float">
              <span className="text-4xl font-black gradient-text select-none">G</span>
            </div>
          </div>

          {/* 타이틀 */}
          <h1 className="text-6xl sm:text-8xl font-black mb-6 tracking-tighter animate-fade-up-d1">
            <span className="gradient-text glow-text">G-BUS</span>
          </h1>

          {/* 서브타이틀 */}
          <p className="text-xl sm:text-2xl text-gbus-text font-semibold mb-3 animate-fade-up-d2">
            가장 빠른 게이머 수송 작전
          </p>
          <p className="text-gbus-text-muted mb-14 max-w-md mx-auto leading-relaxed animate-fade-up-d2">
            대규모 회차 던전 버스 대기열을 실시간으로 관리하세요.
            배럭 벌크 예약부터 역경매까지.
          </p>

          {/* CTA */}
          <div className="flex gap-4 justify-center mb-20 animate-fade-up-d3">
            <Link
              href="/login"
              className="group relative inline-flex items-center px-10 py-4 bg-gradient-to-r from-gbus-primary to-gbus-primary-dim text-white font-bold rounded-2xl shadow-[0_4px_24px_rgba(108,92,231,0.4)] hover:shadow-[0_8px_40px_rgba(108,92,231,0.55)] transition-all duration-300 active:scale-[0.97] btn-shine text-lg"
            >
              시작하기
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-10 py-4 glass text-gbus-text font-bold rounded-2xl transition-all duration-300 hover:border-gbus-primary/40 hover:shadow-[0_4px_20px_rgba(108,92,231,0.1)] text-lg"
            >
              로그인
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left animate-fade-up-d3">
            {[
              {
                icon: "&#x26A1;",
                title: "무한 익스프레스",
                desc: "20명 이상 무제한 대기열. 실시간 순번 관리와 닉네임 원클릭 복사.",
                color: "gbus-primary",
                glow: "rgba(108,92,231,0.15)",
              },
              {
                icon: "&#x1F3AF;",
                title: "역경매 시스템",
                desc: "배럭 유저가 가격을 제시하면 기사들이 경쟁 입찰. 합리적인 가격 형성.",
                color: "gbus-accent",
                glow: "rgba(0,206,201,0.15)",
              },
              {
                icon: "&#x1F514;",
                title: "실시간 알림",
                desc: "내 순번 3개 전 즉시 알림. 노쇼 방지 신뢰도 시스템 내장.",
                color: "gbus-warning",
                glow: "rgba(253,203,110,0.15)",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 border-glow cursor-default"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-${f.color}/10 border border-${f.color}/20 flex items-center justify-center text-xl mb-4 transition-all duration-300 group-hover:scale-110`}
                  dangerouslySetInnerHTML={{ __html: f.icon }}
                />
                <h3 className="font-bold mb-2 text-gbus-text text-lg">{f.title}</h3>
                <p className="text-sm text-gbus-text-muted leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-16 glass rounded-2xl p-1 animate-fade-up-d3">
            <div className="grid grid-cols-3 divide-x divide-gbus-border/30">
              <div className="text-center py-5 px-4">
                <div className="text-3xl font-black gradient-text mb-1">6</div>
                <div className="text-xs text-gbus-text-dim font-medium">지원 던전</div>
              </div>
              <div className="text-center py-5 px-4">
                <div className="text-3xl font-black text-gbus-accent mb-1">30+</div>
                <div className="text-xs text-gbus-text-dim font-medium">배럭 최대 인원</div>
              </div>
              <div className="text-center py-5 px-4">
                <div className="text-3xl font-black text-gbus-warning mb-1">24/7</div>
                <div className="text-xs text-gbus-text-dim font-medium">실시간 운영</div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-20 text-left animate-fade-up-d3">
            <h2 className="text-2xl font-bold text-center mb-10">
              <span className="gradient-text">이용 방법</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: "01", title: "가입", desc: "이메일로 간편 가입" },
                { step: "02", title: "인증", desc: "디스코드에서 테이머 인증" },
                { step: "03", title: "예약", desc: "배럭 캐릭터 벌크 예약" },
                { step: "04", title: "탑승", desc: "순번 알림 후 즉시 탑승" },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-gbus-primary/10 border border-gbus-primary/25 flex items-center justify-center text-sm font-bold text-gbus-primary-light mb-3">
                    {s.step}
                  </div>
                  <h4 className="font-bold text-sm mb-1">{s.title}</h4>
                  <p className="text-xs text-gbus-text-dim">{s.desc}</p>
                  {i < 3 && (
                    <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2">
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-gbus-text-dim border-t border-gbus-border/20">
        <span className="opacity-60">G-BUS &copy; 2026</span>
        <span className="mx-2 opacity-30">|</span>
        <span className="opacity-60">Powered by Hundred Core</span>
        <p className="text-[10px] text-gbus-text-dim/40 mt-2">이 서비스는 비공식 팬 커뮤니티 도구이며, 게임 개발사 및 퍼블리셔와 무관합니다.</p>
      </footer>
    </div>
  );
}
