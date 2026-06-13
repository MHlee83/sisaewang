// 개인정보처리방침 / 이용약관 정적 페이지 (Play Console 제출용)
// helmet CSP 영향을 피하려고 index.ts 최상단(보안 미들웨어 이전)에서 서빙한다.

const CONTACT_EMAIL = 'kdatalab.dev@gmail.com';
const SERVICE_NAME = '시세왕';
const EFFECTIVE_DATE = '2026-06-13';

const baseStyle = `
  body { font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; line-height: 1.7; color: #222; max-width: 760px; margin: 0 auto; padding: 24px 18px 64px; }
  h1 { font-size: 22px; border-bottom: 2px solid #1B5E20; padding-bottom: 10px; }
  h2 { font-size: 17px; margin-top: 28px; color: #1B5E20; }
  p, li { font-size: 14px; }
  ul { padding-left: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th { background: #F1F8E9; }
  .meta { color: #666; font-size: 13px; }
  footer { margin-top: 40px; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; }
`;

export const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${SERVICE_NAME} 개인정보처리방침</title>
<style>${baseStyle}</style></head><body>
<h1>${SERVICE_NAME} 개인정보처리방침</h1>
<p class="meta">시행일: ${EFFECTIVE_DATE}</p>

<p>${SERVICE_NAME}(이하 "서비스")은 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위해 다음과 같은 처리방침을 둡니다.</p>

<h2>1. 수집하는 개인정보 항목 및 수집 방법</h2>
<p>서비스는 회원가입 및 서비스 이용 과정에서 아래 정보를 수집합니다.</p>
<table>
<tr><th>구분</th><th>수집 항목</th></tr>
<tr><td>회원가입(필수)</td><td>이메일 주소, 비밀번호(암호화 저장), 닉네임</td></tr>
<tr><td>서비스 이용</td><td>관심 품목, 가격 알림 설정, 커뮤니티 게시글·댓글, 사용자 유형(소비자/생산자/구매자)</td></tr>
<tr><td>알림</td><td>기기 푸시 토큰(FCM 토큰)</td></tr>
<tr><td>자동 생성</td><td>서비스 이용 기록, 접속 로그</td></tr>
</table>
<p>비밀번호는 인증 제공자(Google Firebase Authentication)를 통해 암호화되어 처리되며, 서비스 운영자는 비밀번호 원문을 보관하지 않습니다.</p>

<h2>2. 개인정보의 수집 및 이용 목적</h2>
<ul>
<li>회원 식별 및 본인 인증, 회원 관리</li>
<li>농수축산물 시세 정보 및 가격 알림 제공</li>
<li>커뮤니티 기능 제공 및 운영</li>
<li>서비스 개선 및 신규 기능 개발</li>
<li>부정 이용 방지 및 문의 응대</li>
</ul>

<h2>3. 개인정보의 보유 및 이용 기간</h2>
<p>이용자의 개인정보는 원칙적으로 <strong>회원 탈퇴 시 지체 없이 파기</strong>합니다. 단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.</p>

<h2>4. 개인정보의 제3자 제공</h2>
<p>서비스는 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 법령에 근거가 있거나 수사기관의 적법한 요청이 있는 경우는 예외로 합니다.</p>

<h2>5. 개인정보 처리의 위탁</h2>
<p>서비스는 안정적인 운영을 위해 아래와 같이 개인정보 처리를 위탁합니다.</p>
<table>
<tr><th>수탁자</th><th>위탁 업무</th></tr>
<tr><td>Google LLC (Firebase)</td><td>회원 인증, 푸시 알림 발송</td></tr>
<tr><td>Railway Corp.</td><td>서버 및 데이터베이스 호스팅</td></tr>
</table>

<h2>6. 이용자의 권리와 행사 방법</h2>
<p>이용자는 언제든지 본인의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있으며, 회원 탈퇴를 통해 개인정보 수집·이용 동의를 철회할 수 있습니다. 요청은 아래 연락처로 접수할 수 있습니다.</p>

<h2>7. 만 14세 미만 아동의 개인정보</h2>
<p>서비스는 만 14세 미만 아동의 회원가입을 받지 않으며, 아동의 개인정보를 수집하지 않습니다.</p>

<h2>8. 개인정보의 안전성 확보 조치</h2>
<p>서비스는 개인정보 보호를 위해 전송 구간 암호화(HTTPS), 접근 권한 관리, 비밀번호 암호화 저장 등의 조치를 취하고 있습니다.</p>

<h2>9. 개인정보 보호책임자 및 문의처</h2>
<ul>
<li>서비스명: ${SERVICE_NAME}</li>
<li>문의 이메일: ${CONTACT_EMAIL}</li>
</ul>

<h2>10. 고지의 의무</h2>
<p>본 개인정보처리방침의 내용이 변경되는 경우, 변경 사항을 서비스 내 또는 본 페이지를 통해 공지합니다.</p>

<footer>© ${SERVICE_NAME}. 시행일 ${EFFECTIVE_DATE}.</footer>
</body></html>`;

export const TERMS_HTML = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${SERVICE_NAME} 이용약관</title>
<style>${baseStyle}</style></head><body>
<h1>${SERVICE_NAME} 이용약관</h1>
<p class="meta">시행일: ${EFFECTIVE_DATE}</p>

<h2>제1조 (목적)</h2>
<p>본 약관은 ${SERVICE_NAME}(이하 "서비스")이 제공하는 농수축산물 시세 정보 및 관련 서비스의 이용 조건과 절차, 이용자와 서비스의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.</p>

<h2>제2조 (서비스의 내용)</h2>
<ul>
<li>전국 공영도매시장 경락가 등 농수축산물 시세 정보 제공</li>
<li>관심 품목 가격 알림</li>
<li>이용자 간 정보 공유 커뮤니티</li>
<li>기타 서비스가 정하는 부가 기능</li>
</ul>

<h2>제3조 (시세 정보의 성격)</h2>
<p>서비스가 제공하는 시세 정보는 공공데이터 등 외부 출처를 기반으로 한 <strong>참고용 정보</strong>이며, 실제 거래 가격과 차이가 있을 수 있습니다. 서비스는 정보의 정확성·완전성을 보증하지 않으며, 이용자가 본 정보를 근거로 행한 거래 및 의사결정의 결과에 대해 책임을 지지 않습니다.</p>

<h2>제4조 (회원의 의무)</h2>
<ul>
<li>타인의 정보를 도용하거나 허위 정보를 등록하지 않을 것</li>
<li>커뮤니티에 욕설·비방·음란물·광고성 게시물 등을 게시하지 않을 것</li>
<li>서비스의 정상적인 운영을 방해하는 행위를 하지 않을 것</li>
</ul>

<h2>제5조 (게시물의 관리)</h2>
<p>서비스는 이용자가 작성한 게시물이 관련 법령 또는 본 약관에 위배되는 경우 사전 통지 없이 삭제하거나 블라인드 처리할 수 있습니다.</p>

<h2>제6조 (서비스의 변경 및 중단)</h2>
<p>서비스는 운영상·기술상 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</p>

<h2>제7조 (책임의 제한)</h2>
<p>서비스는 천재지변, 외부 데이터 제공처의 장애 등 불가항력으로 인한 서비스 제공 불가에 대해 책임을 지지 않습니다.</p>

<h2>제8조 (문의)</h2>
<p>본 약관 및 서비스에 관한 문의: ${CONTACT_EMAIL}</p>

<footer>© ${SERVICE_NAME}. 시행일 ${EFFECTIVE_DATE}.</footer>
</body></html>`;
