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

  const playIndex = useCallback((i: number) => {
    const a = audioRef.current;
    const segs = segmentsRef.current;
    const seg = segs[i];
    if (!a || !seg || i < 0 || i >= segs.length) return;
    currentRef.current = i;
    setCurrent(i);
    a.src = seg.url;
    a.playbackRate = rateRef.current;
    a.load();
    const p = a.play();
    if (p) p.catch((e) => setError(String(e)));
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
    a.addEventListener('ended', onEnded);
    a.addEventListener('play', () => setStatus('playing'));
    a.addEventListener('pause', () =>
      setStatus((s) => (s === 'playing' ? 'paused' : s)),
    );
    return () => {
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
        const segs = m.segments.map((x) => ({
          text: x.text,
          // 优先图床绝对地址（publicUrl），回退本地预生成文件
          url: x.publicUrl ?? '/audio/' + slug + '/' + x.audio,
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
