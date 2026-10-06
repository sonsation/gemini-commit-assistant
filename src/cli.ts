#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import {
  loadConfig,
  saveConfig,
  runFirstTimeSetup,
  GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE,
} from './config';
import {
  isInsideGitRepo,
  stageAll,
  getStagedDiff,
  getUnstagedDiff,
  getStagedNameStatus,
  getStagedStat,
  getShortStatus,
  detectIssueKey,
  getChangeStats,
  commitWithMessage,
  commitWithFile,
  commitInteractive,
  setupGitAlias,
  unsetupGitAlias,
} from './git';
import { executeAiCli, isCommandAvailable, fetchAvailableModels } from './ai';
import { createDetailedPrompt, createSimplePrompt } from './prompt';
import { formatCommitMessage } from './parser';
import { c, interactiveMenu, promptInput, Spinner } from './ui';
import { t } from './i18n';
import { Language, Provider } from './types';

async function configureSettings(scope: 'global' | 'local', currentLang: Language) {
  const isLocal = scope === 'local';
  const targetFile = isLocal ? LOCAL_CONFIG_FILE : GLOBAL_CONFIG_FILE;

  console.log(`${c.blue}============================================================${c.reset}`);
  console.log(`${c.bold}${t(currentLang, isLocal ? 'config_local_title' : 'config_global_title')}${c.reset}`);
  console.log(`${c.blue}============================================================${c.reset}\n`);

  const currentConfig = loadConfig();
  console.log(`${c.cyan}${t(currentLang, 'config_current_settings')}${c.reset}`);
  console.log(t(currentLang, 'config_current_lang', currentConfig.language));
  console.log(t(currentLang, 'config_current_provider', currentConfig.provider));
  console.log(t(currentLang, 'config_current_model', currentConfig.model));
  console.log('');

  // 1. 언어 선택
  console.log(`${c.cyan}${t(currentLang, 'config_lang_title')}${c.reset}`);
  const langChoice = await interactiveMenu(
    t(currentLang, 'config_lang_title'),
    ['한국어 (Korean)', 'English', t(currentLang, 'config_skip')],
    0
  );
  let newLang: Language = currentConfig.language;
  if (langChoice === 0) newLang = 'ko';
  else if (langChoice === 1) newLang = 'en';

  // 2. AI CLI 선택
  console.log(`\n${c.cyan}${t(newLang, 'config_provider_title')}${c.reset}`);
  const provChoice = await interactiveMenu(
    t(newLang, 'config_provider_title'),
    ['agy (Antigravity / Gemini)', 'claude (Claude Code)', t(newLang, 'config_skip')],
    currentConfig.provider === 'claude' ? 1 : 0
  );
  let newProvider: Provider = currentConfig.provider || 'agy';
  if (provChoice === 0) newProvider = 'agy';
  else if (provChoice === 1) newProvider = 'claude';

  if (!isCommandAvailable(newProvider)) {
    console.log(`${c.yellow}${t(newLang, 'provider_not_installed', newProvider)}${c.reset}`);
  }

  // 3. 모델 선택
  console.log(`\n${c.cyan}${t(newLang, 'config_model_title')}${c.reset}`);
  console.log(t(newLang, 'config_model_fetching'));

  const models = await fetchAvailableModels(newProvider);
  let newModel: string | undefined = currentConfig.model;

  if (models.length === 0) {
    console.log(`${c.yellow}${t(newLang, 'config_model_fetch_failed')}${c.reset}`);
    const manual = await promptInput(t(newLang, 'config_model_manual_prompt'));
    if (manual.toLowerCase() === 'clear') {
      newModel = undefined;
    } else if (manual) {
      newModel = manual;
    }
  } else {
    const modelOpts = [
      t(newLang, 'config_skip'),
      t(newLang, 'config_clear'),
      ...models.map((m) => m.displayName),
    ];
    const modelIdx = await interactiveMenu(t(newLang, 'config_model_title'), modelOpts, 0);

    if (modelIdx === 0) {
      // keep
    } else if (modelIdx === 1) {
      newModel = undefined;
    } else {
      newModel = models[modelIdx - 2].id;
    }
  }

  saveConfig(scope, {
    language: newLang,
    provider: newProvider,
    model: newModel,
  });

  console.log(`\n${c.green}${t(newLang, 'config_saved', targetFile)}${c.reset}`);
}

async function main() {
  const args = process.argv.slice(2);

  // 플래그 파싱
  let stageAllFlag = false;
  let providerOverride: Provider | undefined;
  let action: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all' || arg === '-a') {
      stageAllFlag = true;
    } else if (arg === '--agy') {
      providerOverride = 'agy';
    } else if (arg === '--claude') {
      providerOverride = 'claude';
    } else if (arg === '--provider') {
      const val = args[++i];
      if (val === 'agy' || val === 'claude') {
        providerOverride = val;
      }
    } else if (arg.startsWith('--provider=')) {
      const val = arg.split('=')[1];
      if (val === 'agy' || val === 'claude') {
        providerOverride = val;
      }
    } else if (
      arg === '--setup' ||
      arg === '--unsetup' ||
      arg === '--configure' ||
      arg === '--config-global' ||
      arg === '--config-local' ||
      arg === '--help' ||
      arg === '-h'
    ) {
      action = arg;
    } else {
      console.log(`${c.red}❌ Unknown option: ${arg}${c.reset}`);
      console.log('Usage: aic [--all|-a] [--provider <agy|claude>] [--configure] [--setup|--unsetup] [--help|-h]');
      process.exit(1);
    }
  }

  // 설정 확인 (없으면 최초 실행)
  let config = loadConfig(providerOverride);
  if (!fs.existsSync(GLOBAL_CONFIG_FILE)) {
    config = await runFirstTimeSetup();
  }

  const lang = config.language;

  // 명령어 분기
  if (action === '--help' || action === '-h') {
    console.log(`${c.bold}${t(lang, 'welcome')}${c.reset}\n`);
    console.log(`${c.cyan}${t(lang, 'help_usage')}${c.reset}\n`);
    console.log(`${c.cyan}${t(lang, 'help_options')}${c.reset}`);
    process.exit(0);
  }

  if (action === '--setup') {
    console.log(`${c.cyan}${t(lang, 'setup_progress')}${c.reset}`);
    if (setupGitAlias()) {
      console.log(`${c.green}${t(lang, 'setup_success')}${c.reset}`);
      console.log(`${c.cyan}${t(lang, 'setup_available')}${c.reset}`);
    } else {
      console.log(`${c.red}${t(lang, 'setup_failed')}${c.reset}`);
      process.exit(1);
    }
    process.exit(0);
  }

  if (action === '--unsetup') {
    console.log(`${c.cyan}${t(lang, 'unsetup_progress')}${c.reset}`);
    if (unsetupGitAlias()) {
      console.log(`${c.green}${t(lang, 'unsetup_success')}${c.reset}`);
      console.log(`${c.cyan}${t(lang, 'unsetup_available')}${c.reset}\n`);
      console.log(`${c.cyan}${t(lang, 'unsetup_help')}${c.reset}`);
    } else {
      console.log(`${c.red}${t(lang, 'unsetup_failed')}${c.reset}`);
      process.exit(1);
    }
    process.exit(0);
  }

  if (action === '--config-global') {
    await configureSettings('global', lang);
    process.exit(0);
  }

  if (action === '--config-local') {
    await configureSettings('local', lang);
    process.exit(0);
  }

  if (action === '--configure') {
    const choice = await interactiveMenu(
      t(lang, 'config_which'),
      [t(lang, 'config_choice_global'), t(lang, 'config_choice_local')],
      0
    );
    await configureSettings(choice === 0 ? 'global' : 'local', lang);
    process.exit(0);
  }

  console.log(`${c.magenta}${t(lang, 'welcome')}${c.reset}`);

  // Git 저장소 확인
  if (!isInsideGitRepo()) {
    console.log(`${c.red}${t(lang, 'not_git_repo')}${c.reset}`);
    process.exit(1);
  }

  // --all 플래그: 모든 파일 staging
  if (stageAllFlag) {
    console.log(`${c.cyan}${t(lang, 'staging_all')}${c.reset}`);
    stageAll();
  }

  const provider = config.provider || 'agy';
  const model = config.model;

  // AI CLI 설치 확인
  if (!isCommandAvailable(provider)) {
    console.log(`${c.yellow}${t(lang, 'provider_not_installed', provider)}${c.reset}\n`);
    const fallbackChoice = await interactiveMenu(
      t(lang, 'editor_prompt'),
      [t(lang, 'action_yes'), t(lang, 'action_no')],
      0
    );
    if (fallbackChoice === 0) {
      console.log(`${c.cyan}${t(lang, 'fallback_editor')}${c.reset}\n`);
      process.exit(commitInteractive());
    } else {
      console.log(`${c.cyan}${t(lang, 'editor_cancelled')}${c.reset}`);
      process.exit(0);
    }
  }

  // Staged 변경사항 확인
  const stagedDiff = getStagedDiff();
  if (!stagedDiff) {
    console.log(`${c.yellow}${t(lang, 'no_staged_files')}${c.reset}\n`);
    console.log(`${c.cyan}${t(lang, 'choose_action')}${c.reset}\n`);

    const unstagedDiff = getUnstagedDiff();
    if (unstagedDiff) {
      console.log(`${c.cyan}${t(lang, 'unstaged_files')}${c.reset}`);
      const shortStatus = getShortStatus().split('\n').filter(Boolean);
      shortStatus.slice(0, 10).forEach((l) => console.log(`  ${l}`));
      if (shortStatus.length > 10) {
        console.log(`${c.yellow}... 그리고 ${shortStatus.length - 10}개 파일 더${c.reset}`);
      }
    } else {
      console.log(`${c.cyan}${t(lang, 'no_changes')}${c.reset}`);
    }
    process.exit(1);
  }

  console.log(`${c.cyan}${t(lang, 'analyzing_staged')}${c.reset}`);

  // 브랜치 이슈 키 감지
  const issueKey = detectIssueKey();
  if (issueKey) {
    console.log(`${c.cyan}${t(lang, 'detected_issue', issueKey)}${c.reset}`);
  }

  const stagedStatus = getStagedNameStatus();
  const stagedStat = getStagedStat();

  // 커밋 메시지 생성 및 대화형 메뉴 루프
  while (true) {
    const detailedPrompt = createDetailedPrompt({
      language: lang,
      stagedStatus,
      stagedStat,
      diff: stagedDiff,
      issueKey,
    });

    const modelLabel = model ? `${provider} / ${model}` : provider;
    const spinner = new Spinner(t(lang, 'ai_generating', modelLabel));
    spinner.start();

    let result = await executeAiCli({
      provider,
      prompt: detailedPrompt,
      model,
    });

    let aiMessage = result.output;

    // 만약 메시지가 너무 짧거나 실패한 경우 단순 프롬프트 재시도
    if (!result.success || aiMessage.length < 30) {
      const simplePrompt = createSimplePrompt(lang, stagedStatus);
      result = await executeAiCli({
        provider,
        prompt: simplePrompt,
        model,
      });
      aiMessage = result.output;
    }

    spinner.stop(result.success && Boolean(aiMessage));

    if (!result.success || !aiMessage) {
      console.log(`\n${c.yellow}${t(lang, 'ai_no_response')}${c.reset}`);
      console.log(`${c.cyan}${t(lang, 'fallback_editor')}${c.reset}\n`);
      process.exit(commitInteractive());
    }

    // 포맷팅 정제
    const formattedMessage = formatCommitMessage(aiMessage, issueKey);

    console.log(`\n${c.blue}============================================================${c.reset}`);
    console.log(`${c.green}${t(lang, 'ai_generated')}${c.reset}`);
    console.log(`${c.bold}"${formattedMessage}"${c.reset}`);
    console.log(`${c.blue}============================================================${c.reset}\n`);

    // 변경사항 통계 출력
    const stats = getChangeStats();
    console.log(`${c.cyan}${t(lang, 'change_summary')}${c.reset}`);
    if (stats.added > 0) console.log(`${c.green}${t(lang, 'new_files', String(stats.added))}${c.reset}`);
    if (stats.modified > 0) console.log(`${c.yellow}${t(lang, 'modified_files', String(stats.modified))}${c.reset}`);
    if (stats.deleted > 0) console.log(`${c.red}${t(lang, 'deleted_files', String(stats.deleted))}${c.reset}`);
    console.log('');

    const commitOpts = [
      t(lang, 'action_yes'),
      t(lang, 'action_regenerate'),
      t(lang, 'action_edit'),
      t(lang, 'action_custom'),
      t(lang, 'action_no'),
    ];

    const menuResult = await interactiveMenu(t(lang, 'commit_prompt'), commitOpts, 0);

    // 0: Yes
    if (menuResult === 0) {
      if (commitWithMessage(formattedMessage)) {
        console.log(`${c.green}${t(lang, 'commit_success')}${c.reset}`);
      } else {
        console.log(`${c.red}${t(lang, 'commit_failed')}${c.reset}`);
      }
      break;
    }

    // 1: Regenerate
    if (menuResult === 1) {
      console.log(`\n${c.cyan}${t(lang, 'regenerating_message')}${c.reset}\n`);
      continue;
    }

    // 2: Edit in Editor
    if (menuResult === 2) {
      const tmpFile = path.join(os.tmpdir(), `aic_edit_${process.pid}.txt`);
      fs.writeFileSync(tmpFile, formattedMessage, 'utf8');

      console.log(`${c.cyan}${t(lang, 'editor_starting')}${c.reset}`);
      const editor = process.env.EDITOR || 'vi';
      spawnSync(editor, [tmpFile], { stdio: 'inherit' });

      if (fs.existsSync(tmpFile)) {
        const editedContent = fs.readFileSync(tmpFile, 'utf8').trim();
        if (editedContent.length > 0) {
          if (commitWithFile(tmpFile)) {
            console.log(`${c.green}${t(lang, 'edit_success')}${c.reset}`);
          } else {
            console.log(`${c.red}${t(lang, 'commit_failed')}${c.reset}`);
          }
        } else {
          console.log(`${c.yellow}${t(lang, 'edit_cancelled')}${c.reset}`);
        }
        try {
          fs.unlinkSync(tmpFile);
        } catch {
          // 무시
        }
      }
      break;
    }

    // 3: Custom message
    if (menuResult === 3) {
      const custom = await promptInput(`${c.cyan}${t(lang, 'custom_message')}${c.reset} `);
      if (custom.length > 0) {
        if (commitWithMessage(custom)) {
          console.log(`${c.green}${t(lang, 'custom_success')}${c.reset}`);
        } else {
          console.log(`${c.red}${t(lang, 'commit_failed')}${c.reset}`);
        }
      } else {
        console.log(`${c.yellow}${t(lang, 'empty_message')}${c.reset}`);
        console.log(`${c.red}${t(lang, 'commit_failed')}${c.reset}`);
      }
      break;
    }

    // 4: Cancel
    if (menuResult === 4) {
      console.log(`${c.yellow}${t(lang, 'commit_cancelled')}${c.reset}`);
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error(`${c.red}Fatal Error: ${err.message}${c.reset}`);
  process.exit(1);
});
