import { Language, ReviewLevel } from './types';

export function createDetailedPrompt(params: {
  language: Language;
  stagedStatus: string;
  stagedStat: string;
  diff: string;
  issueKey?: string | null;
  reviewSummary?: string | null;
}): string {
  const { language, stagedStatus, stagedStat, diff, issueKey, reviewSummary } = params;
  // Windows 및 터미널 인자 길이 제한(32KB)을 고려한 안전한 diff 절삭
  const maxDiffLength = process.platform === 'win32' ? 12000 : 25000;
  let truncatedDiff = diff || '';
  if (truncatedDiff.length > maxDiffLength) {
    truncatedDiff = truncatedDiff.slice(0, maxDiffLength) + '\n... (diff truncated)';
  }
  const analysisSnippet = truncatedDiff.split('\n').slice(0, 500).join('\n');

  if (language === 'en') {
    let issueHint = '';
    if (issueKey) {
      issueHint = `
BRANCH ISSUE/TICKET DETECTED:
- The current git branch is associated with ticket: ${issueKey}
- Include this ticket key in the title (e.g. feat(${issueKey}): ... or [${issueKey}] feat: ...)
`;
    }

    let reviewHint = '';
    if (reviewSummary) {
      reviewHint = `
REVIEW SUMMARY:
- Include this review summary at the very end of the commit body, separated by TWO blank lines:
${reviewSummary}
`;
    }

    return `You are a git commit message generator. Analyze these git changes and generate a detailed multiline commit message.

ANALYZE THE CHANGES CAREFULLY:
- Look at file extensions and diff content to understand what changed
- Identify if changes are: code improvements, style/formatting, documentation, features, bug fixes, tests, or cleanup
- Pay attention to deleted files, formatting changes, whitespace fixes
${issueHint}${reviewHint}
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

  let reviewHint = '';
  if (reviewSummary) {
    reviewHint = `
점검 결과 요약:
- 커밋 본문 맨 마지막에 다음 점검 요약 블록을 빈 줄 2개로 구분하여 포함하세요:
${reviewSummary}
`;
  }

  return `You are a git commit message generator. Analyze these git changes and generate a detailed multiline commit message.

ANALYZE THE CHANGES CAREFULLY:
- Look at file extensions and diff content to understand what changed
- Identify if changes are: code improvements, style/formatting, documentation, features, bug fixes, tests, or cleanup
- Pay attention to deleted files, formatting changes, whitespace fixes
${issueHint}${reviewHint}
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

export function createReviewPrompt(params: {
  language: Language;
  level: ReviewLevel;
  diff: string;
  fileName?: string;
}): string {
  const { language, level, diff, fileName } = params;
  const maxDiffLength = process.platform === 'win32' ? 12000 : 25000;
  let truncatedDiff = diff || '';
  if (truncatedDiff.length > maxDiffLength) {
    truncatedDiff = truncatedDiff.slice(0, maxDiffLength) + '\n... (diff truncated)';
  }

  const isEn = language === 'en';
  const fileContext = fileName ? (isEn ? `File: ${fileName}\n` : `대상 파일: ${fileName}\n`) : '';

  let criteria = '';
  if (level === 'light') {
    criteria = isEn
      ? `- Security: Check for hardcoded secrets, API keys, credentials, tokens.
- Debug residue: Check for leftover console.log, print, debugger, temp comments.
- Critical syntax/crash risks: Check for fatal syntax errors, broken imports, null-pointer exceptions.`
      : `- 보안 점검: 하드코딩된 API 키, 토큰, 비밀번호, 민감한 개인정보/인증 정보 노출 여부
- 디버그 코드: 남겨진 console.log, debugger, print, 임시 주석 등 확인
- 치명적 오류: 명백한 런타임 크래시 및 문법 오류 위험`;
  } else if (level === 'strict') {
    criteria = isEn
      ? `- Security & Secrets: Check for credentials, authorization issues, security vulnerabilities.
- Debug residue & TODOs: Check for leftover console.log, debugger, TODO/FIXME comments.
- Robustness & Error handling: Missing try-catch, unhandled promises, edge cases, potential null/undefined errors.
- Code quality & Best practices: Readability, clean architecture, naming conventions, unnecessary complexity or duplication.
- Performance & Types: Inefficient loops, memory leak risks, type safety ('any' abuse).`
      : `- 보안 및 시크릿: API 키, 토큰, 비밀번호, 권한 검증 및 보안 취약점
- 디버그 코드 및 TODO: console.log, debugger, 미완성 TODO/FIXME 주석
- 안정성 및 예외 처리: try-catch 누락, 비동기 에러 미처리, 엣지 케이스, null/undefined 접근 위험
- 코드 품질 및 베스트 프랙티스: 가독성, 클린코드, 함수 분리, 네이밍 규칙, 불필요한 복잡도 및 중복
- 성능 및 타입: 비효율적인 반복문, 메모리 누수 위험, any 타입 남용 등 타입 안정성`;
  } else {
    // standard (default)
    criteria = isEn
      ? `- Security & Secrets: Check for hardcoded credentials, API keys, tokens.
- Debug residue: Check for leftover console.log, debugger, temp code.
- Robustness & Error handling: Missing try-catch, unhandled promise rejections, common logic bugs, null pointer exceptions.
- Unfinished code: Check for unresolved TODO or FIXME comments.`
      : `- 보안 점검: 하드코딩된 API 키, 토큰, 비밀번호 노출 여부
- 디버그 코드: 남아있는 console.log, debugger, 임시 코드
- 안정성 및 예외 처리: 예외 처리 누락, 비동기 에러 미처리, 엣지 케이스 결함
- 미완성 코드: 남겨진 TODO, FIXME 주석 확인`;
  }

  if (isEn) {
    return `You are an expert code reviewer. Perform a code inspection on this git diff for pre-commit review.
Review Level: ${level.toUpperCase()}
${fileContext}
Review Criteria:
${criteria}

OUTPUT FORMAT RULES:
1. Divide your response into two distinct sections: REPORT and SUMMARY.
2. In the REPORT section:
   - If issues are found, list each issue with severity:
     🚨 [Critical] (filename:line or description): specific issue and fix
     ⚠️ [Warning] (filename:line or description): specific issue
     💡 [Suggestion] (filename:line or description): suggestion (only if level is strict)
   - If NO issues or risks found, output exactly:
     ✅ ALL_CLEAR: No issues found.
3. In the SUMMARY section (max 2-3 bullet points to be included in git commit log):
   - Security: status (e.g. Passed / No secrets detected)
   - Quality: status (e.g. Passed / Note on error handling)
   - Note: brief note if any, or 'Clean changes'

Diff content:
${truncatedDiff}

Generate ONLY the review report in this exact structure:
REPORT:
...
SUMMARY:
...`;
  }

  return `당신은 전문 시니어 코드 리뷰어입니다. 커밋 전 사전 점검을 위해 다음 git diff를 점검(코드 리뷰)해주세요.
점검 레벨: ${level.toUpperCase()}
${fileContext}
점검 기준:
${criteria}

출력 포맷 규칙:
1. 반드시 REPORT와 SUMMARY 두 구역으로 나누어 작성하세요.
2. REPORT 구역:
   - 문제가 발견된 경우 심각도별로 목록화하세요:
     🚨 [Critical] (파일명:라인 또는 요약): 구체적인 문제점 및 권장 조치
     ⚠️ [Warning] (파일명:라인 또는 요약): 주의 사항 (디버깅 코드, 예외 처리 누락 등)
     💡 [Suggestion] (파일명:라인 또는 요약): 개선 권장사항 (strict 레벨일 때)
   - 지적할 문제가 전혀 없다면 정확히 다음 한 줄만 출력하세요:
     ✅ ALL_CLEAR: 발견된 문제가 없습니다.
3. SUMMARY 구역 (커밋 메시지에 포함될 2~3줄 요약):
   - 보안/시크릿: 통과 여부 (예: 이상 없음 / 하드코딩된 키 없음)
   - 품질/안정성: 통과 여부 (예: 예외 처리 점검 완료 / 디버그 코드 주의)
   - 비고: 특이사항 1줄 요약 (없으면 '특이사항 없음')

Diff 내용:
${truncatedDiff}

반드시 다음 형식으로만 응답하세요:
REPORT:
...
SUMMARY:
...`;
}
