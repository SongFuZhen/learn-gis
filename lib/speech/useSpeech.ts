'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChapterManifest } from './manifest';

export type SpeechStatus =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'missing'
  | 'error';

export interface SpeechSegmentView {
  text: string;
  url: string;
  /** 整章合并播放：段起点（秒）；与 duration 配套，缺省为逐段文件模式 */
  start?: number;
  duration?: number;
}

export function useSpeech(slug: string) {
  const [status, setStatus] = useState<SpeechStatus>('loading');
  const [segments, setSegments] = useState<SpeechSegmentView[]>([]);
  const [current, setCurrent] = useState(-1);
  const [rate, setRateState] = useState(1);
  const [error, setError] = useState<string | undefined>(undefined);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRef = useRef(-1);
  const segmentsRef = useRef<SpeechSegmentView[]>([]);
  const rateRef = useRef(1);
  // 合并播放：换 src 后等 loadedmetadata 再 seek（元数据未就绪时设 currentTime 会被忽略）
  const pendingSeekRef = useRef<number | null>(null);

  const playIndex = useCallback((i: number) => {
    const a = audioRef.current;
    const segs = segmentsRef.current;
    const seg = segs[i];
    if (!a || !seg || i < 0 || i >= segs.length) return;
    currentRef.current = i;
    setCurrent(i);
    a.playbackRate = rateRef.current;
    const target = new URL(seg.url, window.location.href).href;
    if (a.src !== target) {
      // 逐段模式（或首个合并段）：换源，挂起 seek 待元数据就绪
      pendingSeekRef.current = seg.start ?? 0;
      a.src = seg.url;
      a.load();
      const p = a.play();
      if (p) p.catch((e) => setError(String(e)));
    } else {
      // 合并模式内跳段：同文件直接 seek
      if (seg.start !== undefined) a.currentTime = seg.start;
      const p = a.play();
      if (p) p.catch((e) => setError(String(e)));
    }
  }, []);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    audioRef.current = a;
    const onEnded = () => {
      const next = currentRef.current + 1;
      if (next < segmentsRef.current.length) {
        playIndex(next);
      } else {
        currentRef.current = -1;
        setCurrent(-1);
        setStatus('ended');
      }
    };
    const onLoadedMetadata = () => {
      if (pendingSeekRef.current !== null) {
        a.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }
    };
    // 合并模式：audio 的 ended 只在整章末尾触发，段落推进靠 timeupdate 越界检测
    const onTimeUpdate = () => {
      const i = currentRef.current;
      const seg = segmentsRef.current[i];
      if (!a || !seg || seg.duration === undefined || seg.start === undefined) return;
      if (a.currentTime >= seg.start + seg.duration) {
        const nextSeg = segmentsRef.current[i + 1];
        if (!nextSeg) return; // 末段：自然播到文件结尾，交给 onEnded
        currentRef.current = i + 1;
        setCurrent(i + 1);
        // 无缝衔接：下一段起点与本段结束几乎重合时不 seek，避免回跳重听
        if (nextSeg.start === undefined || Math.abs(a.currentTime - nextSeg.start) > 0.35) {
          a.currentTime = nextSeg.start ?? 0;
        }
      }
    };
    a.addEventListener('loadedmetadata', onLoadedMetadata);
    a.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('ended', onEnded);
    a.addEventListener('play', () => setStatus('playing'));
    a.addEventListener('pause', () =>
      setStatus((s) => (s === 'playing' ? 'paused' : s)),
    );
    // 音频加载失败（404 / 网络中断）：让 UI 可见，而不是无声卡住
    a.addEventListener('error', () => {
      setStatus('error');
      setError('音频文件加载失败');
    });
    return () => {
      a.removeEventListener('loadedmetadata', onLoadedMetadata);
      a.removeEventListener('timeupdate', onTimeUpdate);
      a.removeEventListener('ended', onEnded);
      a.pause();
    };
  }, [playIndex]);

  // slug 变化时在渲染期重置状态（React 官方模式）：避免在 effect 里同步 setState 触发级联渲染
  const [prevSlug, setPrevSlug] = useState(slug);
  if (prevSlug !== slug) {
    setPrevSlug(slug);
    setStatus('loading');
    setSegments([]);
    setCurrent(-1);
  }

  useEffect(() => {
    let cancelled = false;
    currentRef.current = -1;
    (async () => {
      try {
        const r = await fetch('/audio/' + slug + '/manifest.json');
        if (r.status === 404) {
          if (!cancelled) setStatus('missing');
          return;
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const m: ChapterManifest = await r.json();
        // 合并模式：整章一个文件（publicUrl 优先），段级 start/duration 做 seek 定位
        const mergedUrl = m.merged
          ? (m.merged.publicUrl ?? '/audio/' + slug + '/' + m.merged.audio)
          : undefined;
        const segs = m.segments.map((x) => ({
          text: x.text,
          url: mergedUrl ?? (x.publicUrl ?? '/audio/' + slug + '/' + x.audio),
          ...(mergedUrl && x.start !== undefined
            ? { start: x.start, duration: x.duration }
            : {}),
        }));
        if (cancelled) return;
        segmentsRef.current = segs;
        setSegments(segs);
        setStatus(segs.length ? 'ready' : 'missing');
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (currentRef.current < 0 && segmentsRef.current.length) {
      playIndex(0);
    } else if (a.paused) {
      const p = a.play();
      if (p) p.catch((e) => setError(String(e)));
    }
  }, [playIndex]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) play();
    else pause();
  }, [play, pause]);

  const next = useCallback(() => {
    const i = currentRef.current + 1;
    if (i < segmentsRef.current.length) playIndex(i);
  }, [playIndex]);

  const prev = useCallback(() => {
    const i = currentRef.current - 1;
    if (i >= 0) playIndex(i);
  }, [playIndex]);

  const jump = useCallback((i: number) => playIndex(i), [playIndex]);

  const setRate = useCallback((r: number) => {
    rateRef.current = r;
    setRateState(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }, []);

  return { status, segments, current, rate, error, play, pause, toggle, next, prev, jump, setRate };
}
