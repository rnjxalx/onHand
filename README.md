# OnHand — 반려묘 케어 앱 (React Native / Expo)

Figma 디자인을 기반으로 만든 React Native 앱입니다.

## 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 시작
npx expo start
```

터미널에 QR코드가 나타납니다.
- **실제 휴대폰**: App Store / Play Store에서 **Expo Go** 앱을 설치한 뒤 QR코드 스캔
- **iOS 시뮬레이터**: 터미널에서 `i` 입력 (Mac + Xcode 필요)
- **Android 에뮬레이터**: 터미널에서 `a` 입력 (Android Studio 필요)
- **웹 브라우저**: 터미널에서 `w` 입력

## 현재 구현된 화면

Figma `frontend` 파일(vMJ6xyAXJoOYOnUE1xYQAB) 기준으로 전체 플로우를 구현했습니다.

| 플로우 | 화면 | 상태 |
|--------|------|------|
| 온보딩 | 스플래시 · 온보딩1~4 · 권한설정 | ✅ 완료 |
| 인증 | 로그인 · 회원가입 · 비밀번호 재설정(입력/완료) | ✅ 완료 |
| 고양이 등록 | 등록 · 상세정보 · 캐릭터 · 카메라 · 초대 | ✅ 완료 |
| 메인 탭 | 홈 · 케어 · 캘린더 · MY · MY설정 | ✅ 완료 |

### 화면 흐름
```
Splash → Onboarding → Permissions → Login
  Login ─(회원가입)→ Signup → CatRegister → Detail → Character → Main
  Login ─(비밀번호 찾기)→ ForgotPassword → ForgotPasswordSent
  CatRegister ─(이미 등록한 고양이)→ Invite → Main
  CatRegisterCharacter / MySettings ─(사진 등록)→ CatRegisterCamera (모달)
  Main(탭): 홈 / 케어 / 캘린더 / MY ─(설정)→ MySettings
```

- 스플래시는 약 1.8초 후 온보딩으로 자동 전환됩니다.
- 온보딩은 좌우 스와이프 + 다음/이전/시작 버튼으로 이동합니다.
- 카메라 화면은 `expo-camera` 미설치로 프리뷰 이미지 기반 UI 목업입니다(셔터 → 이전 화면 복귀).

## AI 캐릭터 생성 (ComfyUI 서버 연동)

고양이 사진을 찍으면 `../api` 의 FastAPI 백엔드로 업로드 → ComfyUI 가
`basic / happy / sad` 3종 캐릭터를 생성 → 앱이 내려받아 로컬에 저장합니다.

```
[고양이 등록 > 캐릭터] 화면에서 사진 촬영
  → "✨ AI 캐릭터 만들기" 탭
  → POST /api/v1/generate (사진 업로드)
  → GET  /api/v1/jobs/{id} 폴링 (진행률 표시)
  → GET  /api/v1/jobs/{id}/images/{basic|happy|sad} 다운로드
  → cat.generated 에 저장 (홈 화면이 기분에 따라 happy/sad 표시)
```

관련 코드: `src/api/`(서버 클라이언트), `src/store/AppStore.tsx`(`generateCatCharacters`),
`src/screens/CatRegisterCharacterScreen.tsx`(진행 UI).

### 서버 주소 설정
외부망에서는 서버의 10000 포트만 열려 있어, FastAPI(`localhost:10003`)는 **Cloudflare 터널**로 노출합니다.
기본값은 현재 터널 주소로 설정돼 있습니다 (`src/api/config.ts`) — 별도 설정 없이 동작합니다.

```bash
# 서버에서 터널 열기 (출력되는 https 주소를 config.ts 기본값에 반영)
cloudflared tunnel --url http://localhost:10003

# 앱에서 다른 주소로 잠깐 바꿔 테스트할 때
EXPO_PUBLIC_API_BASE_URL=https://새-터널-주소.trycloudflare.com npx expo start
```

> ⚠️ trycloudflare quick tunnel 주소는 터널을 재시작하면 바뀝니다.
> 고정 주소가 필요하면 Cloudflare 계정 + 도메인으로 named tunnel 을 구성하세요.

## 프로젝트 구조

```
catcare-app/
├ App.tsx              앱 진입점 (네비게이션 컨테이너)
├ index.ts             루트 컴포넌트 등록
├ src/
│  ├ theme/            디자인 토큰 (색상/폰트/간격)
│  ├ components/       공통 컴포넌트 (Button, Checkbox, Toggle, TabBar 등)
│  ├ screens/          화면 (Login, Home, Placeholder)
│  ├ navigation/       네비게이터 (Root, MainTabs)
│  └ assets/           이미지/폰트 (아래 참고)
```

## 아직 추가해야 할 것

### 1. 이미지 에셋
화면별 일러스트/사진 에셋은 Figma에서 export해 `src/assets/`에 저장돼 있습니다
(로고, 온보딩 일러스트, 케어 아이콘, 고양이 프로필/캐릭터, 추억 사진 등).
다만 다음은 아직 이모지 placeholder로 표시 중이라 실제 아이콘으로 교체하면 좋습니다.
- 탭바 아이콘 (TabBar.tsx)
- 권한설정 / 케어 / MY설정의 일부 라인 아이콘 (📱 📷 🔔 ✏️ 🗑️ ⚙️ 등)

### 2. 폰트 (Inter)
디자인은 Inter 폰트를 사용합니다. 폰트 파일이 없으면 시스템 기본 폰트로
렌더링되며 앱은 정상 동작합니다. 디자인과 정확히 맞추려면:

1. Inter 폰트 파일(.ttf)을 `src/assets/fonts/`에 추가
2. `App.tsx`의 주석 처리된 `useFonts` 코드를 활성화

## 다음 단계 후보

- 탭/아이콘 이모지 → 실제 아이콘(SVG/PNG) 교체
- 실제 카메라 연동 (`expo-camera`) 및 사진 → AI 캐릭터 생성 파이프라인
- 폼 입력값 상태/유효성 및 백엔드 연동 (등록·로그인·초대 코드 등)
- 온보딩/로그인 완료 상태 저장(AsyncStorage)으로 초기 라우트 분기
- 캘린더 월 이동, 일정 추가/편집 등 인터랙션
