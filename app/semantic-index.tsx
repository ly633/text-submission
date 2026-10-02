import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { semanticIndex, type SemanticIndexStatus } from '@/lib/ai-settings';
import { type TeacherSession } from '@/lib/api';

export function SemanticIndexPanel({ session, revision, disabled }: { session: TeacherSession; revision: number; disabled: boolean }) {
  const [status, setStatus] = useState<SemanticIndexStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    let current = true; active.current = true;
    void semanticIndex(session).then(value => { if (current) { setStatus(value); setError(''); } }).catch(err => { if (current) setError(err instanceof Error ? err.message : '状态读取失败。'); });
    return () => { current = false; active.current = false; };
  }, [session, revision]);
  async function prepare() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      let value = await semanticIndex(session);
      if (active.current) setStatus(value);
      while (active.current && value.enabled && value.ready < value.total) {
        const previous = value.ready;
        value = await semanticIndex(session, true);
        if (active.current) setStatus(value);
        if (value.ready <= previous && value.ready < value.total) throw new Error('准备进度暂未更新，请稍后重试。已完成的部分会保留。');
      }
    } catch (err) { if (active.current) setError(err instanceof Error ? err.message : '准备失败，请重试。'); }
    finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
  if (status && !status.enabled) return null;
  return <section aria-label="语义比对加速">
    <p><strong>语义比对加速</strong></p>
    <p className="ai-privacy">全部历史作业先进行语义匹配，再复核最相近的内容。首次准备完成后，后续提交会复用结果。</p>
    <p aria-live="polite">{status ? `已准备 ${status.ready} / ${status.total} 份作业${status.ready === status.total ? '，可使用加速比对。' : '。请先完成准备，减少首次提交的等待。'}` : '正在读取准备状态…'}</p>
    <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => void prepare()}>{busy && <LoaderCircle size={16} className="spin"/>}{busy ? '正在准备…' : status && status.ready === status.total ? '检查准备状态' : '准备历史作业'}</Button>
    {error && <p className="submission-error" role="alert">{error}</p>}
  </section>;
}
