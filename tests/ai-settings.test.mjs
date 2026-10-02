import test from 'node:test';
import assert from 'node:assert/strict';
import { countWords, fetchPolicy, fetchAISettings, saveAISettings, semanticIndex } from '../lib/ai-settings.ts';
test('word counts include Unicode characters and punctuation but ignore spaces and line breaks', () => {
  assert.equal(countWords('中文 abc，。😀 \n\t'), 8);
  assert.equal(countWords('汉'.repeat(149) + ' 😀\n'), 150);
  assert.equal(countWords('汉'.repeat(150) + '!'), 151);
});
test('policy distinguishes unconfigured AI from ready and rejects malformed data', async () => {
  assert.equal((await fetchPolicy(async () => Response.json({ maxWords: 150, aiReady: false }))).aiReady, false);
  await assert.rejects(fetchPolicy(async () => Response.json({ maxWords: 20000, aiReady: true })), /读取失败/);
});
test('teacher configuration uses bearer auth and never returns an API key to UI state', async () => {
  const config = { endpoint: 'https://provider.example/v1/chat/completions', model: 'model', hasApiKey: true, revision: 1, updatedAt: new Date().toISOString(), apiKey: 'should-be-stripped' };
  const read = await fetchAISettings({ token: 'teacher' }, async (_url, init) => { assert.equal(init.headers.Authorization, 'Bearer teacher'); return Response.json(config); });
  assert.equal(read.apiKey, undefined);
  const input = { endpoint: config.endpoint, model: config.model, apiKey: 'new-key', revision: 1 };
  await saveAISettings({ token: 'teacher' }, input, async (_url, init) => { assert.equal(init.method, 'POST'); assert.deepEqual(JSON.parse(init.body), input); return Response.json(config); });
  await assert.rejects(saveAISettings({ token: 'teacher' }, input, async () => Response.json({ code: 'ai_test', message: '语义比对测试未通过' }, { status: 400 })), /测试未通过/);
});

test('index preparation authenticates and validates progress without returning cache data', async () => {
  const status = { enabled: true, total: 12, ready: 6, model: 'embedding-3', vectors: 'private-cache' };
  const result = await semanticIndex({ token: 'teacher' }, true, async (_url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer teacher'); assert.equal(init.method, 'POST'); assert.equal(init.body, '{}');
    return Response.json(status);
  });
  assert.equal(result.vectors, undefined); assert.equal(result.ready, 6);
  await assert.rejects(semanticIndex({ token: 'teacher' }, false, async () => Response.json({ ...status, ready: 13 })), /状态读取失败/);
});
