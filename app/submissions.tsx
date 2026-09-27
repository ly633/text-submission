import { useEffect, useRef, useState } from 'react';
import { Check, Download, FileText, LoaderCircle, LockKeyhole, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { fetchSubmissions, submitText, type Receipt, type Submission, type SubmissionPage } from '@/lib/submissions';
import { type TeacherSession } from '@/lib/api';
import './submissions.css';
import { MAX_WORDS, countWords, fetchPolicy } from '@/lib/ai-settings';
import { AISettingsPanel } from './ai-settings';

const time = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });
const message = (error: unknown) => error instanceof Error ? error.message : '操作未完成，请重试。';

export function StudentSubmission() {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [policyError, setPolicyError] = useState('');
  const [checking, setChecking] = useState(false);
  const words = countWords(content);
  async function checkPolicy() {
    setChecking(true); setPolicyError('');
    try { setReady((await fetchPolicy()).aiReady); }
    catch { setReady(null); setPolicyError('暂时无法读取提交状态，请保留内容后重新检查。'); }
    finally { setChecking(false); }
  }
  useEffect(() => {
    let active = true;
    void fetchPolicy().then(value => { if (active) setReady(value.aiReady); }).catch(() => { if (active) setPolicyError('暂时无法读取提交状态，请保留内容后重新检查。'); });
    return () => { active = false; };
  }, []);
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const inFlight = useRef(false);
  const success = useRef<HTMLDivElement>(null);
  useEffect(() => { if (receipt) success.current?.focus(); }, [receipt]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (content && !receipt) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [content, receipt]);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!name.trim() || !number.trim() || !content.trim()) { setError('请填写姓名、学号和提交内容。'); return; }
    if (words > MAX_WORDS) { setError('内容不能超过 150 字，请修改后再提交。'); return; }
    if (!ready) { setError('AI 语义检测尚未就绪，请重新检查提交状态或联系教师。'); return; }
    const value = { name: name.trim(), studentNumber: number.trim(), content };
    const signature = JSON.stringify(value);
    if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    inFlight.current = true; setBusy(true); setError('');
    try { setReceipt(await submitText({ ...value, requestId: pending.current.id })); }
    catch (err) { setError(message(err)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function downloadReceipt() {
    if (!receipt) return;
    const blob = new Blob([`文本提交 · 提交回执\n姓名：${name.trim()}\n学号：${number.trim()}\n提交时间：${time(receipt.createdAt)}\n回执编号：${receipt.receipt}\n\n提交内容\n${content}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `提交回执_${receipt.receipt}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main className="submission-workspace">
    <div className="submission-title"><div><h1>文本提交</h1><p>填写信息，粘贴需要提交的内容。</p></div><FileText size={30} aria-hidden="true"/></div>
    {receipt ? <div className="submission-success" ref={success} tabIndex={-1}>
      <span className="submission-check"><Check size={28}/></span><h2>提交成功</h2><p>你的内容已保存，教师可以查看。</p>
      <dl><dt>提交人</dt><dd>{name.trim()}（{number.trim()}）</dd><dt>提交时间</dt><dd>{time(receipt.createdAt)}</dd><dt>回执编号</dt><dd className="receipt-id">{receipt.receipt}</dd></dl>
      <div className="submission-buttons"><Button onClick={downloadReceipt} className="primary-button"><Download size={16}/> 下载回执与原文</Button><Button variant="outline" onClick={() => { setContent(''); setReceipt(null); pending.current = null; }}>再提交一份</Button></div>
    </div> : <form className="submission-form" onSubmit={event => void submit(event)}>
      <fieldset disabled={busy}>
        <div className="submission-identity"><label htmlFor="submit-name">姓名<input id="submit-name" name="name" autoComplete="name" maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="填写真实姓名" required/></label><label htmlFor="submit-number">学号<input id="submit-number" name="studentNumber" autoComplete="off" maxLength={64} value={number} onChange={event => setNumber(event.target.value)} placeholder="填写完整学号" required/></label></div>
        <div className="submission-rules"><strong>提交前请注意</strong><p>内容不超过 150 字。系统会用 AI 与之前已提交作业进行语义比对；语义高度相似的内容将被驳回，请重新思考、修改后再提交。</p><p>请独立思考，不要直接照搬他人观点。</p></div>
        <label className="submission-content" htmlFor="submit-content"><span>提交内容</span><textarea id="submit-content" name="content" maxLength={20000} value={content} onChange={event => { setContent(event.target.value); setError(''); }} placeholder="在这里写下你的独立思考，限 150 字…" aria-invalid={words > MAX_WORDS} aria-describedby="content-help content-count" required spellCheck={false}/></label>
        <div className="submission-help"><span id="content-help">中文、英文字符及标点计数，空格和换行不计。</span><span id="content-count" className={words > MAX_WORDS ? 'count-exceeded' : ''} aria-live="polite">{words} / {MAX_WORDS} 字{words > MAX_WORDS ? `，超出 ${words - MAX_WORDS} 字，无法提交` : ''}</span></div>
      </fieldset>
      {(ready !== true || policyError) && <div className="submission-policy"><output>{checking ? '正在检查提交状态…' : policyError || (ready === false ? '教师尚未配置 AI 接口，暂时无法提交。可先填写内容，待教师配置后重新检查。' : '正在读取提交状态…')}</output><Button type="button" variant="outline" disabled={checking || busy} onClick={() => void checkPolicy()}>重新检查</Button></div>}
      {error && <p className="submission-error" role="alert">{error}</p>}
      <div className="submission-footer"><p><LockKeyhole size={15} aria-hidden="true"/>作业正文将发送至教师配置的 AI 服务进行比对</p><Button type="submit" className="primary-button" disabled={busy || words > MAX_WORDS || ready !== true}>{busy ? <LoaderCircle className="spin" size={17}/> : <Send size={17}/>} {busy ? '正在进行语义比对…' : '检测并提交'}</Button></div>
    </form>}
    <p className="submission-note">无需登录。请核对姓名与学号；仅通过检测的内容会保存。未通过时，当前文字会保留供你修改。</p>
  </main>;
}

export function TeacherSubmissions({ session, onLogin }: { session: TeacherSession | null; onLogin: () => void }) {
  if (!session) return <main className="submission-workspace"><div className="submission-title"><div><h1>提交记录</h1><p>查看和导出学生提交的文本。</p></div></div><div className="submission-login"><LockKeyhole size={30}/><h2>教师登录后查看</h2><p>使用现有教师密码。</p><Button className="primary-button" onClick={onLogin}>教师登录</Button></div></main>;
  return <AuthenticatedSubmissions key={session.token} session={session}/>;
}
function AuthenticatedSubmissions({ session }: { session: TeacherSession }) {
  const [page, setPage] = useState<SubmissionPage | null>(null);
  const [rows, setRows] = useState<Submission[]>([]);
  const [busy, setBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportCount, setExportCount] = useState(0);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);
  const generation = useRef(0);
  const loading = useRef(true);
  useEffect(() => {
    const id = ++generation.current;
    void fetchSubmissions(session).then(value => { if (id === generation.current) { setPage(value); setRows(value.items); } }).catch(err => { if (id === generation.current) setError(message(err)); }).finally(() => { if (id === generation.current) { setBusy(false); loading.current = false; } });
    return () => { generation.current = id + 1; };
  }, [session]);
  async function load(more: boolean) {
    if (!session || loading.current) return;
    const id = generation.current;
    setBusy(true); loading.current = true; setError('');
    try {
      const next = await fetchSubmissions(session, more && page?.nextBefore ? { snapshot: page.snapshot, before: page.nextBefore } : undefined);
      if (id === generation.current) { setPage(next); setRows(previous => more ? [...previous, ...next.items] : next.items); }
    } catch (err) { if (id === generation.current) setError(message(err)); }
    finally { if (id === generation.current) { setBusy(false); loading.current = false; } }
  }
  async function exportAll() {
    if (!session || exporting) return;
    const id = generation.current;
    setExporting(true); setError(''); setExportCount(0);
    try {
      let next = await fetchSubmissions(session);
      const all = [...next.items]; setExportCount(all.length);
      while (next.nextBefore !== null) {
        if (id !== generation.current) return;
        next = await fetchSubmissions(session, { snapshot: next.snapshot, before: next.nextBefore });
        all.push(...next.items); setExportCount(all.length);
      }
      if (id !== generation.current) return;
      const { downloadSubmissions } = await import('@/lib/submission-export');
      if (id === generation.current) downloadSubmissions(all);
    } catch (err) { if (id === generation.current) setError(message(err)); }
    finally { setExporting(false); }
  }
  return <main className="submission-workspace teacher-submissions">
    <div className="submission-title"><div><h1>提交记录</h1><p>{page ? `共 ${page.total} 条提交，已加载 ${rows.length} 条` : '读取学生提交记录'}</p></div><div className="submission-buttons"><Button variant="outline" disabled={busy || exporting} onClick={() => void load(false)}><RefreshCw size={16} className={busy ? 'spin' : ''}/> 刷新</Button><Button className="primary-button" disabled={exporting || busy || !page?.total} onClick={() => void exportAll()}><Download size={16}/>{exporting ? `正在导出 ${exportCount} 条…` : '导出全部 Excel'}</Button></div></div>
    <AISettingsPanel session={session}/>
    {error && <p className="submission-error" role="alert">{error}</p>}
    <div className="submission-table-wrap" aria-busy={busy}><table className="submission-table"><caption className="sr-only">学生文本提交记录，按提交时间倒序排列</caption><thead><tr><th scope="col">姓名</th><th scope="col">学号</th><th scope="col">提交时间</th><th scope="col">内容</th><th scope="col">操作</th></tr></thead><tbody>{rows.map(row => <tr key={row.receipt}><td>{row.name}</td><td>{row.studentNumber}</td><td>{time(row.createdAt)}</td><td><span className="submission-preview">{row.content}</span></td><td><button className="submission-view" onClick={() => setSelected(row)} aria-label={`查看 ${row.name} 的提交全文`}>查看全文</button></td></tr>)}</tbody></table>{!rows.length && <p className="submission-empty">{busy ? '正在读取…' : error ? '记录未能加载，请重试。' : '还没有提交记录。将学生提交链接发给同学即可开始收集。'}</p>}</div>
    <div className="submission-pagination">{page?.nextBefore !== null && page?.nextBefore !== undefined && <Button variant="outline" disabled={busy || exporting} onClick={() => void load(true)}>{busy ? '正在读取…' : '加载更多'}</Button>}</div>
    <p className="submission-note">同一学生的多次提交分别保留。姓名和学号由学生填写；导出包含全部原文。</p>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="submission-detail"><DialogTitle>{selected?.name}的提交</DialogTitle><DialogDescription>学号 {selected?.studentNumber} · {selected ? time(selected.createdAt) : ''}</DialogDescription><pre>{selected?.content}</pre><p className="receipt-id">回执：{selected?.receipt}</p></DialogContent></Dialog>
  </main>;
}
