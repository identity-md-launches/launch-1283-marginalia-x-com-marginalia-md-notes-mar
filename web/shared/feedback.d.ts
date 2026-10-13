export const SITE: 'marginalia.chat';
export const WEEK_SECONDS: number;
export const MAX_BYTES: number;
export const KINDS: readonly ['Site', 'Mechanics', 'Idea'];
export type FeedbackKind = typeof KINDS[number];
export const BRIEF: { audience: string; scope: string; immutable: string[]; open: string[] };
export function weekOf(seconds?: number): number;
export function utf8Bytes(text: string): number;
export function feedbackMessage(value: { week: number; kind: FeedbackKind; text: string; handle: string }): string;
export interface FeedbackEntry { id: `0x${string}`; address: `0x${string}`; handle: string; kind: FeedbackKind; text: string; ts: number; noted: boolean }
export interface Credits { week: number; attestationRequestId: string; implemented: {id: string; author: string; share: number}[]; notImplemented: {id: string; why: string}[]; synthesis: boolean }
export interface AdoptedBuild { week: number; attestationRequestId: string; implemented: Credits['implemented']; synthesis: boolean; commit: string }
export interface AdoptedLedger { site: string; builds: AdoptedBuild[] }
export interface FeedbackDocument { site: string; week: number; brief: typeof BRIEF; adopted: string[]; entries: FeedbackEntry[] }
export interface WeeklyDocument extends FeedbackDocument { pick: { week: number; attestationRequestId: string; ranked: string[] } | null }
