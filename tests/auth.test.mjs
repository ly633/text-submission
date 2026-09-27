import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateTeacher, endTeacherSession } from '../lib/api.ts';
const token = 'a'.repeat(43);
const expiresAt = '2027-01-01T00:00:00.000Z';
test('standalone login uses existing password but retains no classroom or grading data', async () => {
  const session = await authenticateTeacher('existing-password', async (url, init) => {
    assert.match(url, /\/login$/);
    assert.deepEqual(JSON.parse(init.body), { password: 'existing-password' });
    assert.equal(init.credentials, 'omit');
    return Response.json({ token, login: 'ly633', expiresAt, sha: 'ignored', published: { classroom: { secretGrade: 100 } } });
  });
  assert.deepEqual(session, { token, login: 'ly633', expiresAt });
  await endTeacherSession(session, async (url, init) => { assert.match(url, /\/logout$/); assert.equal(init.headers.Authorization, 'Bearer ' + token); return Response.json({ ok: true }); });
});
test('failed or malformed authentication never grants a teacher session', async () => {
  await assert.rejects(authenticateTeacher('wrong', async () => Response.json({ code: 'auth', message: '密码不正确' }, { status: 401 })), /密码不正确/);
  await assert.rejects(authenticateTeacher('password', async () => Response.json({ token: 'forged', login: 'ly633', expiresAt })), /登录响应无效/);
});
