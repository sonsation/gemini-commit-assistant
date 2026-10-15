export type Language = 'ko' | 'en';
export type Provider = 'agy' | 'claude';
export type ReviewLevel = 'light' | 'standard' | 'strict';

export interface Config {
  language: Language;
  model?: string;
  provider?: Provider;
  reviewLevel?: ReviewLevel;
}

export interface GitChangeStats {
  added: number;
  modified: number;
  deleted: number;
}

export interface FileDiff {
  file: string;
  diff: string;
}

export interface ReviewResult {
  level: ReviewLevel;
  rawReport: string;
  commitSummary: string;
  hasIssues: boolean;
  hasCritical: boolean;
}
