import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen hero-bg">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gbus-text-muted hover:text-gbus-primary-light transition-colors mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          홈으로
        </Link>

        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-2">개인정보처리방침</h1>
          <p className="text-xs text-gbus-text-dim mb-8">최종 수정일: 2026년 2월 22일</p>

          <div className="space-y-6 text-sm text-gbus-text-muted leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">1. 개인정보의 수집 및 이용 목적</h2>
              <p>Hundred Core(이하 &quot;회사&quot;)는 G-BUS 서비스 제공을 위해 다음과 같은 목적으로 개인정보를 수집 및 이용합니다.</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>회원 가입 및 관리: 본인 확인, 서비스 이용 자격 관리</li>
                <li>서비스 제공: 던전 버스 대기열 관리, 예약 기능 제공</li>
                <li>서비스 개선: 이용 통계 분석, 서비스 품질 향상</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">2. 수집하는 개인정보 항목</h2>
              <div className="bg-gbus-bg/40 rounded-xl p-4 border border-gbus-border/20 space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gbus-text mb-1">필수 항목</h3>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>이메일 주소</li>
                    <li>비밀번호 (암호화 저장)</li>
                    <li>닉네임</li>
                    <li>인게임 대표 닉네임</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gbus-text mb-1">자동 수집 항목</h3>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>서비스 이용 기록 (세션 참여, 예약 내역)</li>
                    <li>접속 일시</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">3. 개인정보의 보유 및 이용 기간</h2>
              <p>
                회사는 이용자의 개인정보를 회원 탈퇴 시까지 보유 및 이용합니다.
                다만, 관련 법령에 의해 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                <li>접속에 관한 기록: 3개월 (통신비밀보호법)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">4. 개인정보의 제3자 제공</h2>
              <p>
                회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
                다만, 다음의 경우에는 예외로 합니다.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">5. 개인정보의 처리 위탁</h2>
              <div className="bg-gbus-bg/40 rounded-xl p-4 border border-gbus-border/20">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gbus-border/20">
                      <th className="text-left py-2 font-medium text-gbus-text">수탁업체</th>
                      <th className="text-left py-2 font-medium text-gbus-text">위탁 업무</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gbus-border/10">
                      <td className="py-2">Supabase Inc.</td>
                      <td className="py-2">데이터베이스 호스팅, 인증 서비스</td>
                    </tr>
                    <tr>
                      <td className="py-2">Vercel Inc.</td>
                      <td className="py-2">웹 애플리케이션 호스팅</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">6. 이용자의 권리</h2>
              <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>개인정보 열람 요구</li>
                <li>오류 등이 있을 경우 정정 요구</li>
                <li>삭제 요구</li>
                <li>처리정지 요구</li>
              </ul>
              <p className="mt-2">
                위 권리 행사는 서비스 내 설정 또는 이메일을 통해 요청할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">7. 개인정보의 파기</h2>
              <p>
                회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는
                지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 복구할 수 없는 방법으로 파기합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">8. 개인정보 보호 책임자</h2>
              <div className="bg-gbus-bg/40 rounded-xl p-4 border border-gbus-border/20 text-xs space-y-1">
                <p>담당: Hundred Core 개인정보보호팀</p>
                <p>이메일: privacy@hundredcore.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gbus-text mb-2">9. 개인정보 처리방침 변경</h2>
              <p>
                이 개인정보처리방침은 시행일로부터 적용되며, 변경 사항이 있는 경우
                서비스 내 공지사항을 통해 고지합니다.
              </p>
            </section>

            <section className="pt-4 border-t border-gbus-border/20">
              <p className="text-xs text-gbus-text-dim">
                본 개인정보처리방침은 2026년 2월 22일부터 시행합니다.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
