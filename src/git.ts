import { execSync, spawnSync } from 'child_process';
import { GitChangeStats } from './types';

function runGit(args: string[]): string {
  try {
    const res = spawnSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (res.status === 0) {
      return res.stdout.trim();
    }
  } catch {
    // 무시
  }
  return '';
}

export function isInsideGitRepo(): boolean {
  try {
    const res = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
      stdio: 'ignore',
    });
    return res.status === 0;
  } catch {
    return false;
  }
}

export function stageAll(): boolean {
  try {
    const res = spawnSync('git', ['add', '.'], { stdio: 'inherit' });
    return res.status === 0;
  } catch {
    return false;
  }
}

export function getStagedDiff(): string {
  return runGit(['diff', '--cached']);
}

export function getUnstagedDiff(): string {
  return runGit(['diff']);
}

export function getPorcelainStatus(): string {
  return runGit(['status', '--porcelain']);
}

export function getShortStatus(): string {
  return runGit(['status', '--short']);
}

export function getStagedNameStatus(): string {
  return runGit(['diff', '--cached', '--name-status']);
}

export function getStagedStat(): string {
  return runGit(['diff', '--cached', '--stat']);
}

export function getCurrentBranch(): string {
  return runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
}

/**
 * Git 브랜치 이름에서 이슈 번호/티켓 키 추출 (예: PROJ-123, #45, gh-88)
 */
export function detectIssueKey(): string | null {
  const branch = getCurrentBranch();
  if (!branch) return null;

  // 1. JIRA 스타일: 대문자 영문(2~10자) + 하이픈 + 숫자
  const jiraMatch = branch.match(/[A-Z]{2,10}-[0-9]+/);
  if (jiraMatch) return jiraMatch[0];

  // 2. #숫자 스타일
  const hashMatch = branch.match(/#[0-9]+/);
  if (hashMatch) return hashMatch[0];

  // 3. issue-숫자 or gh-숫자
  const issueMatch = branch.match(/(?:issue|gh)-?([0-9]+)/i);
  if (issueMatch && issueMatch[1]) return `#${issueMatch[1]}`;

  return null;
}

export function getChangeStats(): GitChangeStats {
  const status = getPorcelainStatus();
  if (!status) return { added: 0, modified: 0, deleted: 0 };

  const lines = status.split('\n').filter(Boolean);
  let added = 0;
  let modified = 0;
  let deleted = 0;

  for (const line of lines) {
    if (line.startsWith('??') || line.startsWith('A ') || line.startsWith(' A')) {
      added++;
    } else if (line.includes('M')) {
      modified++;
    } else if (line.includes('D')) {
      deleted++;
    }
  }

  return { added, modified, deleted };
}

export function commitWithMessage(msg: string): boolean {
  const res = spawnSync('git', ['commit', '-m', msg], { stdio: 'inherit' });
  return res.status === 0;
}

export function commitWithFile(filePath: string): boolean {
  const res = spawnSync('git', ['commit', '-F', filePath], { stdio: 'inherit' });
  return res.status === 0;
}

export function commitInteractive(): number {
  const res = spawnSync('git', ['commit'], { stdio: 'inherit' });
  return res.status ?? 1;
}

export function setupGitAlias(): boolean {
  try {
    execSync('git config --global alias.aic "!aic"', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function unsetupGitAlias(): boolean {
  try {
    execSync('git config --global --unset alias.aic', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
