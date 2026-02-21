import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen hero-bg">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gbus-text-muted hover:text-gbus-primary-light transition-colors mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          홈으로
        </Link>

        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-2">이용약관</h1>
          <p className="text-xs text-gbus-text-dim mb-8">최종 수정일: 2026년 2월 22일</p>

          <div className="space-y-6 text-sm text-gbus-text-muted leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">제1조 (목적)</h2>
              <p>
                이 약관은 Hundred Core(이하 &quot;회사&quot;)가 제공하는 G-BUS 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여
                회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">제2조 (정의)</h2>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>&quot;서비스&quot;란 회사가 제공하는 G-BUS 던전 버스 대기열 관리 웹 애플리케이션을 말합니다.</li>
                <li>&quot;이용자&quot;란 이 약관에 따라 서비스를 이용하는 회원을 말합니다.</li>
                <li>&quot;Hundred Core 계정&quot;이란 회사의 통합 인증 시스템을 통해 생성된 계정을 말합니다.</li>
                <li>&quot;버스&quot;란 게임 내에서 고레벨 캐릭터가 저레벨 캐릭터를 던전에서 운반해주는 행위를 말합니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">제3조 (약관의 효력 및 변경)</h2>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
                <li>회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.</li>
                <li>변경된 약관은 서비스 내 공지사항을 통해 공지하며, 공지 후 7일이 경과한 후에 효력이 발생합니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">제4조 (회원가입 및 인증)</h2>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>이용자는 Hundred Core 계정을 통해 서비스에 가입할 수 있습니다.</li>
                <li>가입 시 이메일, 닉네임, 인게임 대표 닉네임 등의 정보를 제공해야 합니다.</li>
                <li>가입 후 디스코드 채널을 통한 인게임 정보 인증 절차가 필요합니다.</li>
                <li>관리자 승인 전까지 서비스 이용이 제한될 수 있습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">제5조 (서비스 이용)</h2>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>서비스는 연중무휴, 1일 24시간 제공을 원칙으로 합니다. 다만 시스템 점검 등 회사가 필요한 경우 서비스를 일시 중단할 수 있습니다.</li>
                <li>이용자는 서비스를 통해 버스 세션 생성, 대기열 예약, 배럭 관리 등의 기능을 이용할 수 있습니다.</li>
                <li>인증 단계에 따라 이용 가능한 기능이 다를 수 있습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">제6조 (이용자의 의무)</h2>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>이용자는 정확한 정보를 제공해야 하며, 허위 정보를 등록해서는 안 됩니다.</li>
                <li>예약 후 무단 불참(노쇼)은 신뢰도 점수 하락의 원인이 됩니다.</li>
                <li>타인의 계정을 도용하거나, 서비스의 정상적인 운영을 방해해서는 안 됩니다.</li>
                <li>서비스를 이용하여 부당한 이익을 추구하거나 타인에게 피해를 주는 행위를 해서는 안 됩니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">제7조 (서비스 이용 제한)</h2>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>회사는 이용자가 본 약관을 위반하는 경우 서비스 이용을 제한하거나 회원 자격을 박탈할 수 있습니다.</li>
                <li>노쇼 누적, 비매너 행위 등으로 인해 신뢰도 점수가 일정 수준 이하로 하락한 경우 서비스 이용이 제한될 수 있습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">제8조 (면책)</h2>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 인해 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.</li>
                <li>회사는 이용자 간의 게임 내 거래 또는 분쟁에 대해 책임을 지지 않습니다.</li>
                <li>서비스는 게임 내 편의 기능을 제공하는 것이며, 게임 내 재화의 실물 가치를 보장하지 않습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">제9조 (분쟁 해결)</h2>
              <p>
                본 약관에 관한 분쟁은 대한민국 법률을 준거법으로 하며, 분쟁이 발생한 경우 회사의
                본사 소재지를 관할하는 법원을 전속 관할 법원으로 합니다.
              </p>
            </section>

            <section className="pt-4 border-t border-gbus-border/20">
              <p className="text-xs text-gbus-text-dim">
                본 약관은 2026년 2월 22일부터 시행합니다.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
