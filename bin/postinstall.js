#!/usr/bin/env node

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const { reset, bold, dim, green, cyan, yellow, blue, magenta } = colors;

// 시스템 언어 감지 (한국어 우선)
const locale = process.env.LANG || process.env.LC_ALL || "en";
const isKorean = locale.includes("ko") || locale.includes("kr");

if (isKorean) {
  console.log(`
${magenta}${bold}Gemini Commit Assistant 설치 완료!${reset}

${cyan}${bold}이제 다음과 같이 사용하실 수 있습니다:${reset}

${green}  aic${reset}                    ${dim}# staged 파일로 AI 커밋 메시지 생성${reset}
${green}  aic --all${reset}              ${dim}# 모든 파일을 staging 후 커밋${reset}
${green}  ai-commit${reset}              ${dim}# 별칭 명령어${reset}

${cyan}${bold}agy 또는 claude CLI를 통해 동작합니다${reset}

${yellow}${bold}시작하기 전에:${reset}
${yellow}  1.${reset} agy 또는 claude CLI가 설치되어 있는지 확인해주세요.
${yellow}  2.${reset} 첫 실행: ${green}aic${reset} ${dim}(언어 및 AI 선택)${reset}

${blue}${bold}추가 설정:${reset}
${blue}  • Git alias 설정:${reset} ${green}aic --setup${reset}
${blue}  • 설정 변경:${reset} ${green}aic --configure${reset}
${blue}  • 도움말:${reset} ${green}aic --help${reset}

${magenta}${bold}자세한 사용법: https://github.com/c17an/gemini-commit-assistant${reset}
`);
} else {
  console.log(`
${magenta}${bold}Gemini Commit Assistant Installation Complete!${reset}

${cyan}${bold}Now you can use it as follows:${reset}

${green}  aic${reset}                    ${dim}# Generate AI commit message for staged files${reset}
${green}  aic --all${reset}              ${dim}# Stage all files and commit${reset}
${green}  ai-commit${reset}              ${dim}# Alias command${reset}

${cyan}${bold}Powered by agy or claude CLI${reset}

${yellow}${bold}Before getting started:${reset}
${yellow}  1.${reset} Make sure agy or claude CLI is installed.
${yellow}  2.${reset} First run: ${green}aic${reset} ${dim}(select language & AI)${reset}

${blue}${bold}Additional settings:${reset}
${blue}  • Set up Git alias:${reset} ${green}aic --setup${reset}
${blue}  • Change language:${reset} ${green}aic --configure${reset}
${blue}  • Show help:${reset} ${green}aic --help${reset}

${magenta}${bold}Documentation: https://github.com/c17an/gemini-commit-assistant${reset}
`);
}
