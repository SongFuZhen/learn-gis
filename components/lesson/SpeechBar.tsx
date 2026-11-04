'use client';
import { useSpeech } from '@/lib/speech/useSpeech';

const RATES = [0.75, 1, 1.25, 1.5];

export default function SpeechBar({ slug }: { slug: string }) {
  const { status, segments, current, rate, error, toggle, next, prev, jump, setRate } =
    useSpeech(slug);

  if (status === 'loading') {
    return (
      <div className='mt-4 rounded-sm border border-border bg-card px-4 py-3 text-sm text-foreground-tertiary'>
        语音加载中…
      </div>
    );
  }
  if (status === 'missing') {
    return (
      <div className='mt-4 rounded-sm border border-border bg-card px-4 py-3 text-sm text-foreground-tertiary'>
        本节音频尚未生成。运行 <code className='rounded bg-surface-muted px-1'>npm run gen:audio</code> 后刷新页面即可朗读。
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className='mt-4 rounded-sm border border-border bg-card px-4 py-3 text-sm text-foreground-tertiary'>
        语音加载失败：{error}
      </div>
    );
  }

  const total = segments.length;
  const playing = status === 'playing';

  return (
    <div className='mt-4 rounded-md border border-border bg-card p-4 shadow-card'>
      <div className='flex flex-wrap items-center gap-3'>
        <button
          onClick={toggle}
          className='inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-brand-gradient px-4 text-sm font-medium text-white transition-opacity hover:opacity-95'
        >
          {playing ? '暂停' : current >= 0 ? '继续' : '朗读本节'}
        </button>
        <button
          onClick={prev}
          disabled={current <= 0}
          aria-label='上一段'
          className='inline-flex h-10 w-10 items-center justify-center rounded-sm border border-border text-foreground-secondary disabled:opacity-40'
        >
          ⏮
        </button>
        <button
          onClick={next}
          disabled={current >= total - 1}
          aria-label='下一段'
          className='inline-flex h-10 w-10 items-center justify-center rounded-sm border border-border text-foreground-secondary disabled:opacity-40'
        >
          ⏭
        </button>
        <span className='text-[13px] tabular text-foreground-tertiary'>
          {current >= 0 ? current + 1 : 0} / {total}
        </span>
        <div className='ml-auto flex items-center gap-1'>
          {RATES.map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              className={
                'h-8 rounded-sm border px-2 text-[12px] ' +
                (rate === r
                  ? 'border-brand bg-brand-soft text-brand-ink'
                  : 'border-border text-foreground-tertiary')
              }
            >
              {r}x
            </button>
          ))}
        </div>
      </div>

      <ol className='mt-3 max-h-56 space-y-1 overflow-y-auto pr-1'>
        {segments.map((seg, i) => (
          <li key={i}>
            <button
              onClick={() => jump(i)}
              className={
                'block w-full truncate rounded-sm px-2 py-1 text-left text-[13px] ' +
                (i === current
                  ? 'bg-brand-soft text-brand-ink'
                  : 'text-foreground-secondary hover:bg-background-subtle')
              }
            >
              <span className='mr-2 tabular text-foreground-tertiary'>
                {String(i + 1).padStart(2, '0')}
              </span>
              {seg.text}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
