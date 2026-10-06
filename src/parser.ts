/**
 * AI가 생성한 원본 메시지를 Conventional Commits 서식으로 정제
 */
export function formatCommitMessage(rawMessage: string, issueKey?: string | null): string {
  // 1. 앞뒤 따옴표, 백틱, 리스트 기호 정리
  let cleaned = rawMessage
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^Loaded cached credentials\.?/g, '')
    .trim();

  // 2. 줄 단위 분리 및 빈 줄 제거
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  const titleRegex = /^[a-zA-Z]+(\([^)]+\))?:/;
  const fileRegex = /^([a-zA-Z0-9_./-]+(?:\.[a-zA-Z0-9_-]+|\/)|Dockerfile|Makefile|LICENSE|README|CHANGELOG):/i;

  let title = '';
  const bodyFiles: string[] = [];
  const otherLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!title && titleRegex.test(line)) {
      title = line;
      continue;
    }

    if (fileRegex.test(line)) {
      bodyFiles.push(line);
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

  return result.join('\n').trim();
}
