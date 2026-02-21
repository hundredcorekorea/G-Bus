import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-gbus-primary">G-BUS</span>
          </h1>
          <p className="text-xl text-gbus-text-muted mb-2">
            가장 빠른 게이머 수송 작전, 지버스가 갑니다!
          </p>
          <p className="text-gbus-text-dim mb-10">
            대규모 회차 던전 버스 대기열을 실시간으로 관리하세요.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-3 bg-gbus-primary hover:bg-gbus-primary-light text-white font-medium rounded-lg transition-colors"
            >
              시작하기
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-3 bg-gbus-surface border border-gbus-border hover:border-gbus-primary text-gbus-text font-medium rounded-lg transition-colors"
            >
              로그인
            </Link>
          </div>

          {/* Features */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-gbus-surface border border-gbus-border rounded-xl p-5">
              <div className="text-2xl mb-3">&#x1F680;</div>
              <h3 className="font-semibold mb-1">무한 익스프레스</h3>
              <p className="text-sm text-gbus-text-muted">
                20명 이상 무제한 대기열 확장. 실시간 순번 관리.
              </p>
            </div>
            <div className="bg-gbus-surface border border-gbus-border rounded-xl p-5">
              <div className="text-2xl mb-3">&#x1F4E6;</div>
              <h3 className="font-semibold mb-1">배럭 벌크 예약</h3>
              <p className="text-sm text-gbus-text-muted">
                다캐릭 닉네임을 한 번에 등록하고 일괄 예약.
              </p>
            </div>
            <div className="bg-gbus-surface border border-gbus-border rounded-xl p-5">
              <div className="text-2xl mb-3">&#x1F514;</div>
              <h3 className="font-semibold mb-1">실시간 알림</h3>
              <p className="text-sm text-gbus-text-muted">
                내 순번이 가까워지면 즉시 알림. 놓치지 마세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-gbus-text-dim border-t border-gbus-border">
        G-BUS &copy; 2026. Powered by Hundred Core.
      </footer>
    </div>
  );
}
