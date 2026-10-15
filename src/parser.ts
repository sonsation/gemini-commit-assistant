import { ReviewLevel, ReviewResult } from './types';

/**
 * AI가 생성한 원본 메시지를 Conventional Commits 서식으로 정제
 */
export function formatCommitMessage(
  rawMessage: string,
  issueKey?: string | null,
  reviewSummary?: string | null
): string {
  // 1. 앞뒤 따옴표, 백틱, 리스트 기호 정리
  let cleaned = rawMessage
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^Loaded cached credentials\.?/g, '')
    .trim();

  // 2. 줄 단위 분리 및 빈 줄 제거
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  const titleRegex = /^[a-zA-Z]+(\([^)]+\))?:/;
  const fileRegex = /^([^\s:\0-\x1f]+(?:\.[a-zA-Z0-9_-]+|\/)|Dockerfile|Makefile|LICENSE|README|CHANGELOG[^\s:]*):/iu;

  let title = '';
  const bodyFiles: string[] = [];
  const otherLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWithoutBullet = line.replace(/^[-*•]\s+/, '');

    if (!title && titleRegex.test(line)) {
      title = line;
      continue;
    }

    if (fileRegex.test(lineWithoutBullet)) {
      bodyFiles.push(lineWithoutBullet);
      continue;
    }

    if (title) {
      otherLines.push(line);
    } else {
      title = line;
    }
  }

  // 브랜치 이슈 키가 감지되었는데 타이틀에 누락되어 있다면 자동으로 접두사 부착
  if (issueKey && title && !title.includes(issueKey)) {
    title = `[${issueKey}] ${title}`;
  }

  // 서식 조합: 타이틀 + 2칸 줄바꿈 + 파일 목록(각 2칸 줄바꿈)
  const result: string[] = [title];

  if (bodyFiles.length > 0) {
    result.push(''); // blank line 1
    result.push(''); // blank line 2
    result.push(bodyFiles.join('\n\n\n'));
  } else if (otherLines.length > 0) {
    result.push('');
    result.push('');
    result.push(otherLines.join('\n\n'));
  }

  let formatted = result.join('\n').trim();

  // 리뷰 요약이 있고 아직 커밋 본문에 포함되어 있지 않다면 하단에 추가
  if (reviewSummary && !formatted.includes(reviewSummary.split('\n')[0])) {
    formatted = `${formatted}\n\n\n${reviewSummary.trim()}`;
  }

  return formatted;
}

/**
 * AI 점검 원본 출력을 터미널 리포트와 커밋 요약으로 파싱
 */
export function parseReviewOutput(raw: string, level: ReviewLevel): ReviewResult {
  const cleaned = raw.trim().replace(/^["'`]+|["'`]+$/g, '').trim();

  let reportPart = '';
  let summaryPart = '';

  const reportIdx = cleaned.indexOf('REPORT:');
  const summaryIdx = cleaned.indexOf('SUMMARY:');

  if (reportIdx !== -1 && summaryIdx !== -1 && summaryIdx > reportIdx) {
    reportPart = cleaned.slice(reportIdx + 7, summaryIdx).trim();
    summaryPart = cleaned.slice(summaryIdx + 8).trim();
  } else if (reportIdx !== -1) {
    reportPart = cleaned.slice(reportIdx + 7).trim();
  } else if (summaryIdx !== -1) {
    reportPart = cleaned.slice(0, summaryIdx).trim();
    summaryPart = cleaned.slice(summaryIdx + 8).trim();
  } else {
    reportPart = cleaned;
  }

  const hasCritical = /🚨|\[Critical\]|CRITICAL/i.test(reportPart);
  const isAllClear = /✅|ALL_CLEAR/i.test(reportPart) && !hasCritical && !/⚠️|\[Warning\]/i.test(reportPart);
  const hasIssues = !isAllClear && (/🚨|⚠️|💡|\[Critical\]|\[Warning\]|\[Suggestion\]/i.test(reportPart));

  // 커밋용 요약 블록 생성
  let commitSummary = `[Review: ${level}]`;
  if (summaryPart) {
    const summaryLines = summaryPart
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^[-*•]\s*/, ''))
      .filter(Boolean);
    if (summaryLines.length > 0) {
      commitSummary += '\n' + summaryLines.map((l) => `- ${l}`).join('\n');
    } else {
      commitSummary += hasIssues
        ? '\n- Quality: Issues noted during pre-commit inspection'
        : '\n- Verification: All checks passed';
    }
  } else {
    commitSummary += hasIssues
      ? '\n- Quality: Issues noted during pre-commit inspection'
      : '\n- Verification: All checks passed';
  }

  return {
    level,
    rawReport: reportPart || cleaned,
    commitSummary,
    hasIssues,
    hasCritical,
  };
}

/**
 * 병렬 분석된 개별 파일 리뷰 결과들을 하나의 종합 리포트로 병합
 */
export function mergeReviewResults(results: ReviewResult[], level: ReviewLevel): ReviewResult {
  if (results.length === 0) {
    return {
      level,
      rawReport: '✅ ALL_CLEAR',
      commitSummary: `[Review: ${level}]\n- Verification: All checks passed`,
      hasIssues: false,
      hasCritical: false,
    };
  }

  const reports: string[] = [];
  const summaries: string[] = [];
  let hasCritical = false;
  let hasIssues = false;

  for (const res of results) {
    if (res.hasCritical) hasCritical = true;
    if (res.hasIssues) hasIssues = true;

    // ALL_CLEAR가 아닌 이슈가 있는 리포트 수집
    if (!/✅|ALL_CLEAR/i.test(res.rawReport)) {
      reports.push(res.rawReport);
    }

    // 커밋용 요약 라인들 수집
    const lines = res.commitSummary.split(/\r?\n/).slice(1);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !summaries.includes(trimmed)) {
        summaries.push(trimmed);
      }
    }
  }

  let finalReport = '';
  if (reports.length > 0) {
    finalReport = reports.join('\n\n');
  } else {
    finalReport = '✅ ALL_CLEAR: 모든 변경사항이 점검을 통과했습니다.';
  }

  let finalSummary = `[Review: ${level}]`;
  if (summaries.length > 0) {
    finalSummary += '\n' + summaries.slice(0, 5).join('\n');
  } else {
    finalSummary += hasIssues
      ? '\n- Quality: Issues noted during pre-commit review'
      : '\n- Verification: All checks passed';
  }

  return {
    level,
    rawReport: finalReport,
    commitSummary: finalSummary,
    hasIssues,
    hasCritical,
  };
}
