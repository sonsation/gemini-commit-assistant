import readline from 'readline';

export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// 터미널 커서 복원 보장
export function showCursor(): void {
  process.stdout.write('\x1b[?25h');
}

export function hideCursor(): void {
  process.stdout.write('\x1b[?25l');
}

// 프로세스 종료 시 커서 복구 핸들러 등록
process.on('exit', () => showCursor());
process.on('SIGINT', () => {
  showCursor();
  process.exit(130);
});
process.on('SIGTERM', () => {
  showCursor();
  process.exit(143);
});

/**
 * 단일 문자의 터미널 표시 너비 계산 (한글/전각/이모지 등은 2칸)
 */
function getCharWidth(char: string): number {
  const code = char.codePointAt(0);
  if (!code) return 0;
  if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return 0;
  if (
    (code >= 0x1100 && code <= 0x115f) || // 한글 자모
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK 부수 등
    (code >= 0xac00 && code <= 0xd7a3) || // 한글 음절
    (code >= 0xf900 && code <= 0xfaff) || // CJK 호환 한자
    (code >= 0xfe10 && code <= 0xfe19) || // 세로 형태
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK 호환 형태
    (code >= 0xff00 && code <= 0xff60) || // 전각 문자
    (code >= 0xffe0 && code <= 0xffe6) || // 전각 기호
    (code >= 0x1f000 && code <= 0x1faff) || // 이모지 및 기호
    (code >= 0x20000 && code <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

/**
 * 터미널 너비에 맞게 문자열 자르기 (자동 줄바꿈 방지)
 */
export function truncateToWidth(str: string, maxWidth: number, ellipsis = '...'): string {
  const clean = str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  let currentWidth = 0;
  for (const char of clean) {
    currentWidth += getCharWidth(char);
  }
  if (currentWidth <= maxWidth) return str;

  const ellipsisWidth = ellipsis.length;
  let truncated = '';
  let width = 0;
  for (const char of clean) {
    const w = getCharWidth(char);
    if (width + w + ellipsisWidth > maxWidth) break;
    truncated += char;
    width += w;
  }
  return truncated + ellipsis;
}

// 브라일 스피너
export class Spinner {
  private timer: NodeJS.Timeout | null = null;
  private readonly frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIdx = 0;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  private formatLine(symbolOrFrame: string): string {
    const cols = process.stdout.columns && process.stdout.columns > 0 ? process.stdout.columns : 80;
    // 심볼(1~2칸) + 공백(1칸) + 터미널 자동줄바꿈 여유버퍼(2칸) 감안
    const maxMsgWidth = Math.max(10, cols - 4);
    const displayMessage = truncateToWidth(this.message, maxMsgWidth);
    return `${displayMessage} ${symbolOrFrame}`;
  }

  start(): void {
    hideCursor();
    this.frameIdx = 0;
    this.timer = setInterval(() => {
      const frame = this.frames[this.frameIdx % this.frames.length];
      this.frameIdx++;
      // \r\x1b[2K: 커서를 맨 앞으로 이동하고 현재 행 전체를 지움
      process.stdout.write(`\r\x1b[2K${c.cyan}${this.formatLine(frame)}${c.reset}`);
    }, 80);
  }

  stop(success = true): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const symbol = success ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    process.stdout.write(`\r\x1b[2K${c.cyan}${this.formatLine(symbol)}${c.reset}\n`);
    showCursor();
  }
}

/**
 * 대화형 TUI 선택 메뉴 (방향키 및 숫자 입력 지원)
 */
export async function interactiveMenu(
  prompt: string,
  options: string[],
  defaultIndex = 0
): Promise<number> {
  let selected = Math.max(0, Math.min(defaultIndex, options.length - 1));
  let inputBuffer = '';
  let renderedLines = 0;

  function render(isUpdate = false) {
    if (isUpdate && renderedLines > 0) {
      // 이전 렌더링된 줄 지우기
      readline.cursorTo(process.stdout, 0);
      readline.moveCursor(process.stdout, 0, -renderedLines);
      readline.clearScreenDown(process.stdout);
    }

    const output: string[] = [];
    output.push(`${c.cyan}${prompt}${c.reset}`);
    if (inputBuffer) {
      output.push(`  ${c.yellow}입력중: ${inputBuffer}${c.reset}`);
    }

    options.forEach((opt, idx) => {
      const num = idx + 1;
      if (idx === selected) {
        output.push(`  ${c.green}▶ ${num}. ${opt}${c.reset}`);
      } else {
        output.push(`    ${num}. ${opt}`);
      }
    });

    renderedLines = output.length;
    process.stdout.write(output.join('\n') + '\n');
  }

  hideCursor();
  render(false);

  return new Promise<number>((resolve) => {
    const isRaw = process.stdin.isRaw;
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    const onData = (data: Buffer) => {
      const key = data.toString();

      // Ctrl+C
      if (key === '\u0003') {
        cleanup();
        process.exit(130);
      }

      // Arrow Up (\u001b[A)
      if (key === '\u001b[A' || key === '\u001bOA') {
        selected = selected <= 0 ? options.length - 1 : selected - 1;
        inputBuffer = '';
        render(true);
        return;
      }

      // Arrow Down (\u001b[B)
      if (key === '\u001b[B' || key === '\u001bOB') {
        selected = selected >= options.length - 1 ? 0 : selected + 1;
        inputBuffer = '';
        render(true);
        return;
      }

      // Enter (\r or \n)
      if (key === '\r' || key === '\n') {
        cleanup();
        // 선택 완료 후 요약 출력
        if (renderedLines > 0) {
          readline.cursorTo(process.stdout, 0);
          readline.moveCursor(process.stdout, 0, -renderedLines);
          readline.clearScreenDown(process.stdout);
        }
        console.log(`${c.cyan}${prompt}${c.reset} ${c.green}${options[selected]}${c.reset}`);
        resolve(selected);
        return;
      }

      // Backspace (\x7f or \b)
      if (key === '\x7f' || key === '\b') {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          render(true);
        }
        return;
      }

      // 숫자 입력
      if (/^[0-9]$/.test(key)) {
        inputBuffer += key;
        const num = parseInt(inputBuffer, 10);
        if (num >= 1 && num <= options.length) {
          selected = num - 1;
        }
        render(true);
        return;
      }
    };

    function cleanup() {
      process.stdin.removeListener('data', onData);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(isRaw);
      }
      process.stdin.pause();
      showCursor();
    }

    process.stdin.on('data', onData);
  });
}

/**
 * 단일 줄 텍스트 입력 받기
 */
export async function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
