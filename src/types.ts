export type Language = 'ko' | 'en';
export type Provider = 'agy' | 'claude';

export interface Config {
  language: Language;
  model?: string;
  provider?: Provider;
}

export interface GitChangeStats {
  added: number;
  modified: number;
  deleted: number;
}
