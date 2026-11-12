'use client';
import { useEffect, useRef } from 'react';
import { LoaderCircle, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useSpeech } from '@/lib/speech/useSpeech';

const RATES = [0.75, 1, 1.25, 1.5];

export default function SpeechBar({
  slug,
  compact = false,
}: {
  slug: string;
  /** 紧凑模式（音频汇总页用）：只显示控制条 + 进度 + 当前文本，不显示段落列表 */
  compact?: boolean;
}) {
  const { status, segments, current, rate, volume, lastAudible, error, toggle, next, prev, jump, setRate, setVolume } =
    useSpeech(slug);

  // 当前段变化时，把段落列表滚动到可见位置
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (current < 0) return;
    listRef.current?.children[current]?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  if (status === 'loading') {
    return (
      <div className='mt-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground-tertiary'>
        语音加载中…
      </div>
    );
  }
  if (status === 'missing') {
    return (
      <div className='mt-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground-tertiary'>
        本节音频尚未生成。运行{' '}
        <code className='rounded bg-surface-muted px-1'>npm run gen:audio</code>{' '}
        后刷新页面即可朗读。
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className='mt-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground-tertiary'>
        音频加载失败{error ? `（${error}）` : ''}，请检查网络后
        <button onClick={() => jump(Math.max(0, current))} className='mx-1 text-info underline underline-offset-2'>
          重试
        </button>
        ；本地开发请确认<code className='mx-1 rounded bg-surface-muted px-1'>public/audio/</code>
        下已有音频文件。
      </div>
    );
  }

  const total = segments.length;
  const playing = status === 'playing';
  const buffering = status === 'buffering';
  const progress = current >= 0 ? ((current + 1) / total) * 100 : 0;
  const curText = current >= 0 ? (segments[current]?.text ?? null) : null;

  // 点击进度条按比例跳段（各段时长不一，仅近似定位）
  const seekByRatio = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    jump(Math.max(0, Math.min(total - 1, Math.floor(ratio * total))));
  };

  return (
    <div className='mt-4 rounded-lg border border-border bg-card p-4 shadow-card'>
      {/* 控制行：播放 / 上下段 / 进度计数 / 倍速 */}
      <div className='flex flex-wrap items-center gap-2.5'>
        <button
          onClick={toggle}
          aria-label={playing ? '暂停' : buffering ? '正在加载音频' : '播放'}
          className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-brand transition-opacity hover:opacity-90'
        >
          {playing ? (
            <Pause className='h-[18px] w-[18px]' strokeWidth={2} />
          ) : buffering ? (
            <LoaderCircle className='h-[18px] w-[18px] animate-spin' strokeWidth={2} />
          ) : (
            <Play className='ml-0.5 h-[18px] w-[18px]' strokeWidth={2} />
          )}
        </button>
        <button
          onClick={prev}
          disabled={current <= 0}
          aria-label='上一段'
          className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground-secondary transition-colors hover:bg-background-hover disabled:opacity-40'
        >
          <SkipBack className='h-4 w-4' strokeWidth={1.8} />
        </button>
        <button
          onClick={next}
          disabled={current >= total - 1}
          aria-label='下一段'
          className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground-secondary transition-colors hover:bg-background-hover disabled:opacity-40'
        >
          <SkipForward className='h-4 w-4' strokeWidth={1.8} />
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
                'h-8 rounded-full border px-2.5 text-[12px] transition-colors ' +
                (rate === r
                  ? 'border-brand bg-brand-soft font-medium text-brand-ink'
                  : 'border-border text-foreground-tertiary hover:bg-background-hover')
              }
            >
              {r}x
            </button>
          ))}
        </div>
      </div>

      {/* 播放进度条：可点击跳段 */}
      <div
        role='slider'
        aria-label='播放进度'
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current + 1}
        tabIndex={0}
        onClick={seekByRatio}
        className='mt-3.5 h-1.5 cursor-pointer rounded-full bg-background-subtle'
      >
        <div
          className='h-full rounded-full bg-brand-gradient transition-[width] duration-300'
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 当前段落文本 */}
      <p className='mt-3 min-h-[2.75em] rounded-sm bg-background-subtle px-3 py-2 text-[13px] leading-relaxed text-foreground-secondary'>
        {buffering ? '远程音频缓冲中，收到数据后会自动继续…' : (curText ?? '点击播放，从第一段开始朗读本节；点击下方任意段落可从该处起播。')}
      </p>

      <div className='mt-3 flex items-center gap-2 text-foreground-tertiary'>
        <button
          type='button'
          onClick={() => setVolume(volume > 0 ? 0 : lastAudible)}
          aria-label={volume > 0 ? '静音' : '恢复音量'}
          className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-background-hover'
        >
          {volume > 0 ? <Volume2 className='h-4 w-4' /> : <VolumeX className='h-4 w-4' />}
        </button>
        <input
          type='range'
          min='0'
          max='2'
          step='0.05'
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label='朗读音量'
          aria-valuetext={`${Math.round(volume * 100)}%${volume > 1 ? '，增强' : ''}`}
          className='h-1.5 min-w-0 flex-1 cursor-pointer accent-[hsl(var(--brand-primary))]'
        />
        <span className='w-[5.5rem] shrink-0 text-right text-[12px] tabular'>
          {Math.round(volume * 100)}%{volume > 1 ? ' 增强' : ''}
        </span>
      </div>

      {/* 段落列表 */}
      {!compact && (
        <ol ref={listRef} className='mt-2 max-h-56 space-y-0.5 overflow-y-auto pr-1'>
          {segments.map((seg, i) => (
            <li key={i}>
              <button
                onClick={() => jump(i)}
                className={
                  'block w-full truncate rounded-sm px-2 py-1 text-left text-[13px] transition-colors ' +
                  (i === current
                    ? 'bg-brand-soft font-medium text-brand-ink'
                    : 'text-foreground-secondary hover:bg-background-hover')
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
      )}
    </div>
  );
}
