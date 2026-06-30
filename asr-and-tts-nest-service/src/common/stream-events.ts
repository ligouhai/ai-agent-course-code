/*
 * @Date: 2026-06-15 14:40:41
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 14:41:35
 */
export const AI_TTS_STREAM_EVENT = 'ai.tts.stream';

export type AiTtsStreamEvent =
  | { type: 'start'; sessionId: string; query: string }
  | { type: 'chunk'; sessionId: string; chunk?: string }
  | { type: 'end'; sessionId: string }
  | { type: 'error'; sessionId: string; error: string };
