import fs from 'fs';
import path from 'path';
import os from 'os';
import { Config, Language, Provider } from './types';
import { interactiveMenu, c } from './ui';
import { t } from './i18n';

export const GLOBAL_CONFIG_FILE = path.join(os.homedir(), '.gemini-commit-config.json');
export const LOCAL_CONFIG_FILE = path.resolve(process.cwd(), '.aicrc');

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as T;
    }
  } catch {
    // 파싱 오류 무시
  }
  return null;
}

function writeJsonFile(filePath: string, data: Record<string, unknown>): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Provider와 Model 간의 호환성 검증 (불일치 시 모델 초기화)
 */
export function sanitizeModelForProvider(provider: Provider, model?: string): string | undefined {
  if (!model) return undefined;
  if (provider === 'claude') {
    if (model.toLowerCase().includes('gemini')) return undefined;
  } else if (provider === 'agy') {
    const lower = model.toLowerCase();
    if (
      lower.includes('claude') ||
      lower === 'opus' ||
      lower === 'sonnet' ||
      lower === 'haiku' ||
      lower === 'fable'
    ) {
      return undefined;
    }
  }
  return model;
}

/**
 * 설정 불러오기 (로컬 설정이 글로벌 설정을 오버라이드)
 */
export function loadConfig(providerOverride?: Provider): Config {
  const global = readJsonFile<Partial<Config>>(GLOBAL_CONFIG_FILE) || {};
  const local = readJsonFile<Partial<Config>>(LOCAL_CONFIG_FILE) || {};

  let language: Language = local.language || global.language || 'ko';
  let provider: Provider = global.provider || 'agy';
  let model: string | undefined = global.model;

  // 로컬 provider가 명시되었을 때
  if (local.provider) {
    if (local.provider !== global.provider && !local.model) {
      // 로컬과 글로벌 provider가 다른데 로컬 모델이 없으면 글로벌 모델 상속 차단
      model = undefined;
    }
    provider = local.provider;
  }

  // 로컬 모델이 명시되었으면 적용
  if (local.model !== undefined) {
    model = local.model || undefined;
  }

  // CLI 플래그 오버라이드
  if (providerOverride) {
    if (providerOverride !== provider) {
      model = undefined;
    }
    provider = providerOverride;
  }

  // 모델-제공자 호환성 보정
  model = sanitizeModelForProvider(provider, model);

  return { language, provider, model };
}

/**
 * 설정 저장
 */
export function saveConfig(
  target: 'global' | 'local',
  settings: { language: Language; provider?: Provider; model?: string }
): void {
  const filePath = target === 'global' ? GLOBAL_CONFIG_FILE : LOCAL_CONFIG_FILE;
  const payload: Record<string, string> = {
    language: settings.language,
  };
  if (settings.provider) payload.provider = settings.provider;
  if (settings.model) payload.model = settings.model;

  writeJsonFile(filePath, payload);
}

/**
 * 최초 실행 대화형 설정
 */
export async function runFirstTimeSetup(): Promise<Config> {
  console.log(`${c.magenta}🎉 Welcome to AI Commit Assistant!${c.reset}`);
  console.log(`${c.blue}============================================================${c.reset}`);
  console.log(`${c.bold}First-time setup${c.reset}`);
  console.log(`${c.blue}============================================================${c.reset}\n`);

  const langIdx = await interactiveMenu(
    'Please select your preferred language for UI and commit messages:',
    ['한국어 (Korean)', 'English'],
    0
  );
  const language: Language = langIdx === 0 ? 'ko' : 'en';

  console.log('');
  const providerIdx = await interactiveMenu(
    'Which AI CLI should generate your commit messages? / 어떤 AI CLI를 사용할까요?',
    ['agy (Antigravity / Gemini)', 'claude (Claude Code)'],
    0
  );
  const provider: Provider = providerIdx === 0 ? 'agy' : 'claude';

  saveConfig('global', { language, provider });

  const label = language === 'ko' ? '한국어' : 'English';
  console.log(`\n${c.green}✅ ${label} / AI CLI: ${provider}${c.reset}`);

  return { language, provider };
}
