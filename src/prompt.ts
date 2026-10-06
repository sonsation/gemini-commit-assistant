import { Language } from './types';

export function createDetailedPrompt(params: {
  language: Language;
  stagedStatus: string;
  stagedStat: string;
  diff: string;
  issueKey?: string | null;
}): string {
  const { language, stagedStatus, stagedStat, diff, issueKey } = params;
  const analysisSnippet = diff.split('\n').slice(0, 2000).join('\n');

  if (language === 'en') {
    let issueHint = '';
    if (issueKey) {
      issueHint = `
BRANCH ISSUE/TICKET DETECTED:
- The current git branch is associated with ticket: ${issueKey}
- Include this ticket key in the title (e.g. feat(${issueKey}): ... or [${issueKey}] feat: ...)
`;
    }

    return `You are a git commit message generator. Analyze these git changes and generate a detailed multiline commit message.

ANALYZE THE CHANGES CAREFULLY:
- Look at file extensions and diff content to understand what changed
- Identify if changes are: code improvements, style/formatting, documentation, features, bug fixes, tests, or cleanup
- Pay attention to deleted files, formatting changes, whitespace fixes
${issueHint}
GENERATE MESSAGE IN THIS FORMAT:

TITLE (50 chars max):
- Start with: feat: (new features), fix: (bug fixes), refactor: (code improvement), style: (formatting), docs: (documentation), test: (tests), perf: (performance), chore: (cleanup/maintenance)
- Brief summary in English

BODY (after TWO blank lines):
- filename: specific description of changes
- IMPORTANT: TWO blank lines between each file
- Use English language

Git Diff Stat:
${stagedStat}

Git Status (Staged only):
${stagedStatus}

Changes Analysis:
${analysisSnippet}

EXACT FORMAT REQUIRED (copy this structure):

feat: Implement user authentication system and loading components


src/utils/auth.ts: JWT token validation and user permission management


src/components/LoadingSpinner.vue: Improved user experience during async operations

CRITICAL: Use exactly TWO newlines between title and body, and TWO newlines between each file.
Keep descriptions under 80 characters.
Generate ONLY the commit message, no quotes:`;
  }

  // 한국어 프롬프트
  let issueHint = '';
  if (issueKey) {
    issueHint = `
브랜치 이슈/티켓 번호 감지됨:
- 현재 git 브랜치는 티켓 ${issueKey} 와 연관되어 있습니다.
- 커밋 제목에 이 티켓 번호를 포함하세요 (예: feat(${issueKey}): ... 또는 [${issueKey}] feat: ...)
`;
  }

  return `You are a git commit message generator. Analyze these git changes and generate a detailed multiline commit message.

ANALYZE THE CHANGES CAREFULLY:
- Look at file extensions and diff content to understand what changed
- Identify if changes are: code improvements, style/formatting, documentation, features, bug fixes, tests, or cleanup
- Pay attention to deleted files, formatting changes, whitespace fixes
${issueHint}
GENERATE MESSAGE IN THIS FORMAT:

TITLE (50 chars max):
- Start with: feat: (새 기능), fix: (버그 수정), refactor: (코드 리팩토링), style: (포맷팅), docs: (문서), test: (테스트), perf: (성능 개선), chore: (기타/유지보수)
- Brief summary in Korean

BODY (after TWO blank lines):
- filename: specific description of changes
- IMPORTANT: TWO blank lines between each file
- Use Korean language

Git Diff Stat:
${stagedStat}

Git Status (Staged only):
${stagedStatus}

Changes Analysis:
${analysisSnippet}

EXACT FORMAT REQUIRED (copy this structure):

feat: 사용자 인증 시스템 구현 및 로딩 컴포넌트 추가


src/utils/auth.ts: JWT 토큰 검증 및 사용자 권한 관리 기능 구현


src/components/LoadingSpinner.vue: 비동기 작업 중 사용자 경험 개선

CRITICAL: Use exactly TWO newlines between title and body, and TWO newlines between each file.
Keep descriptions under 80 characters.
Generate ONLY the commit message, no quotes:`;
}

export function createSimplePrompt(language: Language, stagedStatus: string): string {
  const snippet = stagedStatus.split('\n').slice(0, 10).join(' ');
  if (language === 'en') {
    return `Generate a detailed English commit message with title and body for: ${snippet}`;
  }
  return `Generate a detailed Korean commit message with title and body for: ${snippet}`;
}
