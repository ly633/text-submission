import { useEffect, useState } from 'react';
import { FileText, LoaderCircle, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { authenticateTeacher, endTeacherSession, type TeacherSession } from '@/lib/api';
import { StudentSubmission, TeacherSubmissions } from './submissions';

export default function App() {
  const [teacherView] = useState(() => new URLSearchParams(window.location.search).get('view') === 'records');
  const [session, setSession] = useState<TeacherSession | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!session) return;
    const expiry = setTimeout(() => { setSession(null); setNotice('登录已过期，请重新登录查看提交记录。'); }, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => clearTimeout(expiry);
  }, [session]);
  function openLogin() { setPassword(''); setError(''); setLoginOpen(true); }
  async function login(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const entered = password; setPassword('');
    try { setSession(await authenticateTeacher(entered)); setLoginOpen(false); setNotice(''); }
    catch (err) { setError(err instanceof Error ? err.message : '登录失败，请重试。'); }
    finally { setBusy(false); }
  }
  async function logout() {
    const previous = session; setSession(null); setPassword(''); setNotice('');
    if (previous) { try { await endTeacherSession(previous); } catch { setNotice('本页已退出；网络中断，服务器会话将在到期后自动失效。'); } }
  }
  return <>
    <header className="site-header"><a className="brand" href="./"><span className="brand-mark"><FileText size={24}/></span><span>文本提交系统</span></a><nav className="header-actions" aria-label="主导航"><a className="submission-nav" href="./" aria-current={!teacherView ? 'page' : undefined}>学生提交</a><a className="submission-nav" href="?view=records" aria-current={teacherView ? 'page' : undefined}>教师查看</a>{teacherView && (session ? <Button variant="outline" onClick={() => void logout()}>退出登录</Button> : <Button variant="outline" onClick={openLogin}><LockKeyhole size={15}/>教师登录</Button>)}</nav></header>
    {notice && <output className="session-notice">{notice}</output>}
    {teacherView ? <TeacherSubmissions session={session} onLogin={openLogin}/> : <StudentSubmission/>}
    <Dialog open={loginOpen} onOpenChange={open => { if (!busy) { setLoginOpen(open); if (!open) setPassword(''); } }}><DialogContent className="login-dialog"><DialogTitle>教师登录</DialogTitle><DialogDescription>使用现有教师密码查看提交记录。</DialogDescription><form className="login-form" onSubmit={event => void login(event)}><input type="hidden" name="username" autoComplete="username" value="ly633"/><label htmlFor="teacher-password">密码<input id="teacher-password" name="password" type="password" autoComplete="current-password" required value={password} maxLength={72} disabled={busy} onChange={event => setPassword(event.target.value)}/></label>{error && <p className="submission-error" role="alert">{error}</p>}<Button type="submit" className="primary-button" disabled={busy || !password}>{busy && <LoaderCircle size={16} className="spin"/>}{busy ? '正在验证…' : '登录'}</Button></form></DialogContent></Dialog>
  </>;
}
