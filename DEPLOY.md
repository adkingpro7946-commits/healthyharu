# 배포 가이드 — 건강한 하루

이 사이트는 **순수 정적 사이트**(HTML/CSS/JS)라 서버·DB 없이 어디든 올릴 수 있습니다.
아래 순서대로 하면 인터넷에 공개하고 애드센스까지 신청할 수 있습니다.

---

## 0. 로컬에서 미리보기 (지금 확인용)

```bash
# 사이트 폴더에서
py -m http.server 5500
# 브라우저에서 http://localhost:5500 접속
```
> ⚠️ HTML을 파일(`file://`)로 바로 열면 도구의 데이터(JSON) 로딩이 막힙니다. 꼭 위처럼 로컬 서버로 여세요.

---

## 1. 도메인 설정 현황

**도메인: `healthyharu.co.kr` (가비아에서 등록 예정)**

사이트 안의 도메인 관련 구성은 이미 **healthyharu.co.kr 기준으로 모두 완료**되어 있습니다.
| 항목 | 상태 |
|------|------|
| `contact.html` 이메일 | ✅ `adkingpro7946@gmail.com` 설정됨 |
| `robots.txt`, `sitemap.xml` | ✅ `https://healthyharu.co.kr` 반영됨 |
| 전 페이지 `canonical` + Open Graph(카톡 공유) | ✅ healthyharu.co.kr 기준 자동 삽입됨 |
| `gen_sitemap.py` 의 `DOMAIN` | ✅ healthyharu.co.kr |
| `ads.txt` | ⏳ 애드센스 승인 후 `google.com, pub-...` 한 줄 추가 |

> **남은 일(나중에):** ① 가비아에서 `healthyharu.co.kr` 등록·결제 → ② 호스팅(아래 2단계)에 도메인 연결(DNS) → ③ 애드센스 승인 후 pub-ID 입력.

도메인을 바꾸게 되면 `gen_sitemap.py`의 `DOMAIN`만 고치고 `py gen_sitemap.py` 를 실행하면 sitemap이 다시 만들어집니다.
(canonical/OG는 `scratchpad/finalize_domain.py` 방식으로 일괄 갱신 가능)

---

## 2. 무료로 인터넷에 올리기

### 방법 A — Netlify (가장 쉬움, 추천)
1. [netlify.com](https://www.netlify.com) 가입
2. "Add new site → Deploy manually"에 **이 폴더를 통째로 드래그**
3. 몇 초 뒤 `랜덤이름.netlify.app` 주소로 공개됨
4. 원하는 도메인 연결 가능 (Domain settings)
- 장점: 사이트가 **도메인 루트(/)**에 올라가 `404.html`, 절대경로가 그대로 작동.

### 방법 B — GitHub Pages (무료, 깃허브 사용 시)
1. 깃허브에 새 저장소 만들고 이 폴더 내용을 push
2. Settings → Pages → Branch를 `main` / `/(root)`로 설정
3. `https://아이디.github.io/저장소이름/` 으로 공개
- ⚠️ 주소가 루트가 아니라 `/저장소이름/` 하위라, `404.html`의 절대경로(`/css/...`)가 어긋날 수 있습니다.
  → **사용자 지정 도메인(CNAME)**을 연결하면 루트가 되어 문제 없이 작동합니다.

### 방법 C — Cloudflare Pages / Vercel
Netlify와 거의 동일하게 폴더 업로드 또는 깃 연동으로 배포.

---

## 3. Google 애드센스 신청

1. 먼저 사이트를 **실제 도메인**으로 공개해 두세요(위 2단계).
2. [애드센스](https://adsense.google.com) 가입 → 사이트 주소 등록
3. 애드센스가 주는 확인 코드를 넣습니다. 이 사이트는 이미 준비돼 있어요:
   - `js/ads.js` 상단의 `var ADSENSE_CLIENT = "";` 를
     `var ADSENSE_CLIENT = "ca-pub-본인번호";` 로 교체
   - 이 한 줄만 바꾸면 **모든 페이지의 광고 자리**가 자동으로 실제 광고로 바뀝니다.
     (승인 전에는 비워두면 회색 자리표시만 보입니다.)
4. 루트 `ads.txt` 를 본인 pub-ID로 교체.
5. 심사 통과까지 보통 수일~수주. 아래 체크리스트가 이미 반영돼 있습니다.

### 애드센스 승인 체크리스트 (이 사이트 반영 완료)
- [x] 개인정보처리방침(privacy.html) — 애드센스·쿠키 문구 포함
- [x] 의료정보 면책조항(disclaimer.html) — YMYL 필수
- [x] 소개/문의/이용약관 + 모든 페이지 푸터 링크
- [x] 알맹이 있는 글 다수 (증상·영양제·질환·생활)
- [x] 도구 조작 화면에는 광고를 넣지 않음(오조작 방지)
- [x] 광고가 콘텐츠보다 많아 보이지 않게 배치(글당 2개)
- [ ] (배포 후) 실제 도메인 + ads.txt + ADSENSE_CLIENT 입력

---

## 4. 검색엔진 등록 (SEO)
- [Google Search Console](https://search.google.com/search-console) 에 도메인 등록
- `sitemap.xml` 제출 → 색인 요청
- 네이버는 [서치어드바이저](https://searchadvisor.naver.com) 에 등록

---

## 5. 유지보수 팁
- 새 글을 추가하면 해당 카테고리 `index.html` 목록과 `sitemap.xml`(gen_sitemap.py 재실행)만 갱신하면 됩니다.
- 공통 헤더·푸터·메뉴는 `js/layout.js` 한 곳만 고치면 전체에 반영됩니다.
- 디자인/글씨크기 등은 `css/style.css` 상단의 CSS 변수에서 조정하세요.
