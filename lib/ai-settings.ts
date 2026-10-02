import { ApiError, type TeacherSession } from './api.ts';
import { request } from './submissions.ts';
export const MAX_WORDS = 150;
export const countWords = (text: string) => Array.from(text.replace(/\s/gu, '')).length;
export type AISettings = { endpoint: string; model: string; hasApiKey: boolean; revision: number; updatedAt: string | null };
export type SemanticIndexStatus = { enabled: boolean; total: number; ready: number; model: string | null };
export async function semanticIndex(session: TeacherSession, prepare = false, fetcher: typeof fetch = fetch): Promise<SemanticIndexStatus> {
  const value = await request('/semantic-index', { method: prepare ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + session.token, ...(prepare ? { 'Content-Type': 'application/json' } : {}) }, ...(prepare ? { body: '{}' } : {}) }, fetcher, 70000) as SemanticIndexStatus;
  if (!value || typeof value.enabled !== 'boolean' || !Number.isSafeInteger(value.total) || !Number.isSafeInteger(value.ready) || value.total < 0 || value.ready < 0 || value.ready > value.total || !(value.model === null || typeof value.model === 'string')) throw new ApiError('invalid', '加速准备状态读取失败，请重试。');
  return { enabled: value.enabled, total: value.total, ready: value.ready, model: value.model };
}
export async function fetchPolicy(fetcher: typeof fetch = fetch) {
  const result = await request('/submission-policy', {}, fetcher);
  if (result?.maxWords !== MAX_WORDS || typeof result.aiReady !== 'boolean') throw new ApiError('invalid', '提交规则读取失败，请重新检查。');
  return result as { maxWords: number; aiReady: boolean };
}
function settings(value: unknown): AISettings {
  const data = value as AISettings | null;
  if (!data || typeof data.endpoint !== 'string' || typeof data.model !== 'string' || typeof data.hasApiKey !== 'boolean' || !Number.isSafeInteger(data.revision) || data.revision < 0 || !(data.updatedAt === null || typeof data.updatedAt === 'string' && Number.isFinite(Date.parse(data.updatedAt)))) throw new ApiError('invalid', 'AI 设置读取失败，请重新加载。');
  return { endpoint: data.endpoint, model: data.model, hasApiKey: data.hasApiKey, revision: data.revision, updatedAt: data.updatedAt };
}
export async function fetchAISettings(session: TeacherSession, fetcher: typeof fetch = fetch) {
  return settings(await request('/ai-settings', { headers: { Authorization: 'Bearer ' + session.token } }, fetcher));
}
export async function saveAISettings(session: TeacherSession, input: { endpoint: string; model: string; apiKey: string; revision: number }, fetcher: typeof fetch = fetch) {
  return settings(await request('/ai-settings', { method: 'POST', headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' }, body: JSON.stringify(input) }, fetcher, 70000));
}
