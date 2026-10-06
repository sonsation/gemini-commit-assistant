import { spawn, spawnSync } from 'child_process';
import { Provider } from './types';

export function isCommandAvailable(cmd: string): boolean {
  try {
    const res = spawnSync('which', [cmd], { stdio: 'ignore' });
    return res.status === 0;
  } catch {
    return false;
  }
}

export interface AiExecutionResult {
  success: boolean;
  output: string;
  exitCode: number;
}

/**
 * AI CLI 실행 (Promise 기반 비동기 프로세스)
 */
export async function executeAiCli(params: {
  provider: Provider;
  prompt: string;
  model?: string;
}): Promise<AiExecutionResult> {
  const { provider, prompt, model } = params;

  const args: string[] = [];
  if (model) {
    args.push('--model', model);
  }

  if (provider === 'claude') {
    args.push('-p', prompt);
  } else {
    // agy: --print 가 프롬프트를 값으로 받음
    args.push('--print', prompt);
  }

  return new Promise<AiExecutionResult>((resolve) => {
    const child = spawn(provider, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', () => {
      resolve({
        success: false,
        output: stderr || 'Process execution error',
        exitCode: 1,
      });
    });

    child.on('close', (code) => {
      const combined = (stdout + '\n' + stderr).trim();
      resolve({
        success: code === 0,
        output: stdout.trim() || combined,
        exitCode: code ?? 1,
      });
    });
  });
}

export interface ModelItem {
  id: string;
  displayName: string;
}

/**
 * Provider별 사용 가능한 모델 목록 조회
 */
export async function fetchAvailableModels(provider: Provider): Promise<ModelItem[]> {
  if (provider === 'claude') {
    return [
      { id: 'opus', displayName: 'Opus (latest)' },
      { id: 'sonnet', displayName: 'Sonnet (latest)' },
      { id: 'haiku', displayName: 'Haiku (latest - fastest)' },
      { id: 'claude-opus-5', displayName: 'Claude Opus 5' },
      { id: 'claude-sonnet-5', displayName: 'Claude Sonnet 5' },
      { id: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5' },
    ];
  }

  // agy models 조회
  try {
    const res = spawnSync('agy', ['models'], { encoding: 'utf8' });
    if (res.status === 0 && res.stdout) {
      const lines = res.stdout.split('\n').filter(Boolean);
      const list: ModelItem[] = [];
      for (const line of lines) {
        if (line.includes('Fetching')) continue;
        const [id, name] = line.split('\t');
        if (id) {
          list.push({ id: id.trim(), displayName: name ? `${name.trim()} (${id.trim()})` : id.trim() });
        }
      }
      if (list.length > 0) return list;
    }
  } catch {
    // 조회 실패 시
  }

  return [];
}
