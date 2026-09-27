export const API_BASE = import.meta.env?.VITE_SUBMISSION_API_BASE || 'https://gdl-teacher-ly633.golden-whale-7483.chatgpt.site/api';
export type TeacherSession = { token: string; login: string; expiresAt: string };
export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.name = 'ApiError'; this.code = code; }
}
function readSession(value: unknown): TeacherSession {
  const item = value as TeacherSession | null;
  if (!item || item.login !== 'ly633' || !/^[A-Za-z0-9_-]{43}$/.test(item.token ?? '') || !Number.isFinite(Date.parse(item.expiresAt))) throw new ApiError('auth', '登录响应无效，请重试。');
  // Keep only submission-site session data. Never import grades or classroom drafts.
  return { token: item.token, login: item.login, expiresAt: item.expiresAt };
}
async function authRequest(path: string, body: unknown, token?: string, fetcher: typeof fetch = fetch): Promise<unknown> {
  let response: Response;
  try { response = await fetcher(API_BASE + path, { method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) }); }
  catch { throw new ApiError('network', '连接失败，请稍后重试。'); }
  let result: unknown;
  try { result = await response.json(); } catch { throw new ApiError('invalid', '服务返回了无效结果，请稍后重试。'); }
  if (!response.ok) {
    const error = result as { code?: unknown; message?: unknown } | null;
    throw new ApiError(typeof error?.code === 'string' ? error.code : 'server', typeof error?.message === 'string' ? error.message : '服务暂时不可用，请稍后重试。');
  }
  return result;
}
export async function authenticateTeacher(password: string, fetcher: typeof fetch = fetch): Promise<TeacherSession> {
  if (!password) throw new ApiError('auth', '请输入教师密码。');
  return readSession(await authRequest('/login', { password }, undefined, fetcher));
}
export async function endTeacherSession(session: TeacherSession, fetcher: typeof fetch = fetch) {
  await authRequest('/logout', {}, session.token, fetcher);
}
