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

// 브라일 스피너
export class Spinner {
  private timer: NodeJS.Timeout | null = null;
  private readonly frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIdx = 0;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    hideCursor();
    this.frameIdx = 0;
    this.timer = setInterval(() => {
      const frame = this.frames[this.frameIdx % this.frames.length];
      this.frameIdx++;
      process.stdout.write(`\r${c.cyan}${this.message} ${frame}${c.reset}`);
    }, 80);
  }

  stop(success = true): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const symbol = success ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    process.stdout.write(`\r${c.cyan}${this.message} ${symbol}${c.reset}\n`);
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
