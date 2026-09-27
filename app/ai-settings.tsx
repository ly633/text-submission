import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAISettings, saveAISettings, type AISettings } from '@/lib/ai-settings';
import { type TeacherSession } from '@/lib/api';

export function AISettingsPanel({ session }: { session: TeacherSession }) {
  const [config, setConfig] = useState<AISettings | null>(null);
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const active = useRef(true);
  const inFlight = useRef(false);
  async function load() {
    setLoading(true); setError('');
    try { const value = await fetchAISettings(session); if (active.current) { setConfig(value); setEndpoint(value.endpoint); setModel(value.model); setKey(''); setSaved(false); } }
    catch (err) { if (active.current) setError(err instanceof Error ? err.message : '读取失败。'); }
    finally { if (active.current) setLoading(false); }
  }
  useEffect(() => {
    active.current = true;
    let current = true;
    void fetchAISettings(session).then(value => { if (current) { setConfig(value); setEndpoint(value.endpoint); setModel(value.model); } }).catch(err => { if (current) setError(err instanceof Error ? err.message : '读取失败。'); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; active.current = false; };
  }, [session]);
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); if (!config || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setSaved(false);
    try {
      const value = await saveAISettings(session, { endpoint: endpoint.trim(), model: model.trim(), apiKey: key.trim(), revision: config.revision });
      if (active.current) { setConfig(value); setEndpoint(value.endpoint); setModel(value.model); setKey(''); setSaved(true); }
    } catch (err) { if (active.current) setError(err instanceof Error ? err.message : '保存失败，原设置未更改。'); }
    finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
  return <details className="ai-settings" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary><Settings size={18} aria-hidden="true"/><span>AI 接口设置</span><span className="ai-status">{loading ? '读取中…' : config?.hasApiKey ? '已配置' : '待配置 · 学生暂不能提交'}</span></summary>
    <p>支持 OpenAI 兼容的 Chat Completions 接口。填写你使用的 AI 服务商信息；保存时会先用示例文本测试连接与返回格式。</p>
    {config && <form onSubmit={event => void save(event)}>
      <fieldset disabled={busy || loading}>
        <label htmlFor="ai-endpoint">完整接口地址<input id="ai-endpoint" type="url" value={endpoint} onChange={event => { setEndpoint(event.target.value); setSaved(false); }} placeholder="https://你的服务商域名/v1/chat/completions" autoComplete="off" required maxLength={1000}/></label>
        <div className="ai-fields"><label htmlFor="ai-model">模型名称<input id="ai-model" value={model} onChange={event => { setModel(event.target.value); setSaved(false); }} placeholder="填写服务商给出的模型 ID" autoComplete="off" required maxLength={200}/></label><label htmlFor="ai-key">API Key<input id="ai-key" type="password" value={key} onChange={event => { setKey(event.target.value); setSaved(false); }} placeholder={config.hasApiKey ? '已保存；留空沿用，填写则替换' : '填写 API Key'} autoComplete="new-password" required={!config.hasApiKey || endpoint.trim() !== config.endpoint} maxLength={4096}/></label></div>
      </fieldset>
      <p className="ai-privacy">密钥在服务器加密保存，不会回显。语义比对只发送作业正文，不附带姓名和学号。更换接口地址时需重新填写密钥。</p>
      <div className="submission-buttons"><Button type="submit" className="primary-button" disabled={busy || loading}>{busy && <LoaderCircle className="spin" size={16}/>} {busy ? '正在测试并保存…' : '测试并保存'}</Button><Button type="button" variant="outline" disabled={busy || loading} onClick={() => void load()}>重新加载设置</Button></div>
    </form>}
    {!config && !loading && <Button variant="outline" onClick={() => void load()}>重新加载设置</Button>}
    {error && <p className="submission-error" role="alert">{error}</p>}
    {saved && <output className="ai-saved">接口测试通过，设置已保存。学生提交时将与已有作业进行语义比对。</output>}
  </details>;
}
