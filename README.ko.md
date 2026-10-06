# 🤖 Gemini Commit Assistant

![screenshot](./screenshot.gif)

[English](README.md) | **한국어**

**Antigravity CLI (Gemini)** 및 **Claude Code CLI**를 지원하며 **한국어/영어**로 커밋 메시지를 자동 생성하는 도구입니다.

- 🤖 **멀티 AI CLI 지원**: Antigravity (`agy`)와 Claude Code (`claude`) 중 자유롭게 선택
- 🔄 **대화형 재생성 (Regenerate)**: 생성된 메시지가 마음에 들지 않을 때 원클릭으로 다시 생성
- 🎫 **브랜치 이슈 키 자동 감지**: 브랜치명에서 Jira/GitHub 이슈 번호(`PROJ-123`, `#45` 등)를 추출해 커밋 제목에 반영
- 📝 **Conventional Commits 규격**: 제목 + 파일별 상세 설명 형식 자동 포맷팅

## 📦 설치

```bash
npm install -g gemini-commit-assistant
```

## 🚀 사용법

```bash
# staged 파일로 커밋 메시지 생성
git add file1.js file2.js
aic # (또는 ai-commit)

# 모든 파일을 staging 후 커밋 메시지 생성
aic --all # (ai-commit --all)

# 언어 설정 (한국어/영어)
aic --configure # (ai-commit --configure)

# git alias 설정 (선택사항)
aic --setup # (ai-commit --setup)
git aic  # (git ai-commit)
```

## 🔧 옵션

| 옵션           | 설명                                    |
| -------------- | --------------------------------------- |
| `--all`, `-a`  | 모든 파일을 staging 후 커밋 메시지 생성 |
| `--configure`  | 언어 / AI CLI / 모델 설정 변경          |
| `--provider`   | 이번 실행에만 사용할 AI CLI 지정 (`agy` \| `claude`) |
| `--setup`      | git alias 설정 (`git aic`)              |
| `--unsetup`    | git alias 해제                          |
| `--help`, `-h` | 도움말 표시                             |

## 🤖 AI CLI 선택 (agy / claude)

커밋 메시지를 생성할 AI CLI를 고를 수 있습니다.

- **`agy`** — Antigravity CLI (Gemini) · 기본값
- **`claude`** — Claude Code CLI

```bash
aic --configure         # 대화형으로 AI CLI + 모델 선택 (글로벌/로컬)
aic --provider claude   # 이번 실행에만 claude 사용
aic --claude            # 위와 동일한 축약형
aic --agy               # 이번 실행에만 agy 사용
```

설정은 글로벌(`~/.gemini-commit-config.json`)과 프로젝트별(`.aicrc`) 양쪽에
`"provider"` 값으로 저장되며, 프로젝트 설정이 글로벌 설정보다 우선합니다.

## 💰 비용상 이점

**Gemini CLI 개인 계정 (권장):**

- **60회/분 + 1,000회/일** - 무료
- API 키 방식보다 10배 높은 제한
- 팀 전체 사용 가능

**API 키 방식:**

- 일일 100회만 무료 - 제한적

## 📋 요구사항

- Node.js 16.0.0+
- Git 2.0+
- 다음 지원 AI CLI 중 하나 이상 설치 및 로그인:
  - **Antigravity CLI (`agy`)** (기본값, Gemini)
  - **Claude Code CLI (`claude`)**

## 🛠️ 설정

사용하기 전 원하는 AI CLI를 설치하고 로그인해주세요:

- **Antigravity (Gemini):** `agy` CLI 설치 및 로그인 확인
- **Claude Code:** `claude` CLI 설치 및 로그인 확인 (`npm install -g @anthropic-ai/claude-code`)

## 🎯 예시

**한국어 모드:**

```bash
aic
# 🤖 AI 커밋 메시지 생성기 (Gemini 기반)
# "feat: 사용자 인증 시스템 구현"
```

**영어 모드:**

```bash
aic
# 🤖 AI Commit CLI - AI-powered commit message generator
# "feat: Implement user authentication system"
```

## 📄 라이센스

MIT License
