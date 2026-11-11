'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChapterManifest } from './manifest';

const VOLUME_KEY = 'learn-gis:speech-volume';
const VOLUME_EVENT = 'learn-gis:speech-volume-change';
const DEFAULT_VOLUME = 2;

let sharedContext: AudioContext | null = null;
let sharedLimiter: DynamicsCompressorNode | null = null;
let activeAudio: HTMLAudioElement | null = null;

function clampVolume(value: number) {
  return Math.max(0, Math.min(2, Number.isFinite(value) ? value : DEFAULT_VOLUME));
}

function audioContext() {
  if (sharedContext?.state === 'closed') {
    sharedContext = null;
    sharedLimiter = null;
  }
  if (!sharedContext) {
    const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const Context = window.AudioContext ?? w.webkitAudioContext;
    if (!Context) throw new Error('浏览器不支持 Web Audio 音量增强');
    sharedContext = new Context();
  }
  if (!sharedLimiter) {
    sharedLimiter = sharedContext.createDynamicsCompressor();
    // 放大低响度语音时限制突发峰值，避免削波破音。
    sharedLimiter.threshold.value = -3;
    sharedLimiter.knee.value = 0;
    sharedLimiter.ratio.value = 20;
    sharedLimiter.attack.value = 0.003;
    sharedLimiter.release.value = 0.15;
    sharedLimiter.connect(sharedContext.destination);
  }
  return { context: sharedContext, limiter: sharedLimiter };
}

export type SpeechStatus =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'missing'
  | 'error'
  | 'buffering';

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
  const [volume, setVolumeState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_VOLUME;
    return clampVolume(Number(localStorage.getItem(VOLUME_KEY) ?? DEFAULT_VOLUME));
  });
  const [error, setError] = useState<string | undefined>(undefined);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRef = useRef(-1);
  const segmentsRef = useRef<SpeechSegmentView[]>([]);
  const rateRef = useRef(1);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const enhancedRef = useRef(false);
  // 合并播放：换 src 后等 loadedmetadata 再 seek（元数据未就绪时设 currentTime 会被忽略）
  const pendingSeekRef = useRef<number | null>(null);

  const applyVolume = useCallback((value: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = Math.min(1, value);
    if (gainRef.current) gainRef.current.gain.value = enhancedRef.current ? value : 1;
  }, []);

  const setVolume = useCallback((value: number) => {
    const next = clampVolume(value);
    volumeRef.current = next;
    applyVolume(next);
    setVolumeState(next);
    localStorage.setItem(VOLUME_KEY, String(next));
    window.dispatchEvent(new CustomEvent(VOLUME_EVENT, { detail: next }));
  }, [applyVolume]);

  const enableEnhancement = useCallback(async () => {
    const a = audioRef.current;
    if (!a || volumeRef.current <= 1) return;
    let context: AudioContext;
    let limiter: DynamicsCompressorNode;
    try {
      ({ context, limiter } = audioContext());
    } catch {
      // 老浏览器没有 Web Audio 时仍可原生播放，只是不能超过 100%。
      a.volume = Math.min(1, volumeRef.current);
      return;
    }
    if (!sourceRef.current) {
      a.crossOrigin = 'anonymous';
      sourceRef.current = context.createMediaElementSource(a);
    }
    if (!enhancedRef.current) {
      sourceRef.current.disconnect();
      if (!gainRef.current) gainRef.current = context.createGain();
      sourceRef.current.connect(gainRef.current);
      gainRef.current.connect(limiter);
      enhancedRef.current = true;
    }
    await context.resume();
    applyVolume(volumeRef.current);
  }, [applyVolume]);

  const playAudio = useCallback((a: HTMLAudioElement) => {
    void enableEnhancement().then(() => {
      if (activeAudio && activeAudio !== a) activeAudio.pause();
      activeAudio = a;
      if (audioRef.current !== a) return;
      return a.play();
    }).catch((e: unknown) => {
      if (audioRef.current !== a) return;
      setStatus('error');
      setError(e instanceof Error && e.name === 'NotAllowedError'
        ? '浏览器阻止了播放，请再次点击播放'
        : String(e));
    });
  }, [enableEnhancement]);

  const playIndex = useCallback((i: number) => {
    const a = audioRef.current;
    const segs = segmentsRef.current;
    const seg = segs[i];
    if (!a || !seg || i < 0 || i >= segs.length) return;
    currentRef.current = i;
    setCurrent(i);
    a.playbackRate = rateRef.current;
    a.preload = 'auto';
    const remoteUrl = new URL(seg.url, window.location.href);
    const target = remoteUrl.origin === window.location.origin
      ? remoteUrl.href
      : new URL('/api/audio/stream?url=' + encodeURIComponent(remoteUrl.href), window.location.href).href;
    if (a.src !== target) {
      // 逐段模式（或首个合并段）：换源，挂起 seek 待元数据就绪
      pendingSeekRef.current = seg.start ?? 0;
      a.src = target;
      a.load();
      playAudio(a);
    } else {
      // 合并模式内跳段：同文件直接 seek
      if (seg.start !== undefined) a.currentTime = seg.start;
      playAudio(a);
    }
  }, [playAudio]);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    // 浏览器媒体请求会忽略 referrerPolicy；远程 URL 在 playIndex 走同源 Range 代理。
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
    const onPlay = () => {
      if (audioRef.current !== a) return;
      setStatus('playing');
      if (activeAudio && activeAudio !== a) activeAudio.pause();
      activeAudio = a;
    };
    const onPause = () => {
      if (activeAudio === a) activeAudio = null;
      setStatus((s) => (s === 'playing' || s === 'buffering' ? 'paused' : s));
    };
    const onError = () => {
      if (audioRef.current !== a) return;
      // 音频全部经同源代理，不依赖跨域 Web Audio；加载失败保留可操作错误提示。
      setStatus('error');
      setError('远程音频获取失败，请稍后重试');
    };
    a.addEventListener('loadedmetadata', onLoadedMetadata);
    a.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('ended', onEnded);
    const onWaiting = () => setStatus('buffering');
    const onPlaying = () => setStatus('playing');
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('waiting', onWaiting);
    a.addEventListener('playing', onPlaying);
    // 音频加载失败（404 / 网络中断）：让 UI 可见，而不是无声卡住
    a.addEventListener('error', onError);
    return () => {
      a.removeEventListener('loadedmetadata', onLoadedMetadata);
      a.removeEventListener('timeupdate', onTimeUpdate);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('waiting', onWaiting);
      a.removeEventListener('playing', onPlaying);
      a.removeEventListener('error', onError);
      a.pause();
      sourceRef.current?.disconnect();
      gainRef.current?.disconnect();
      if (activeAudio === a) activeAudio = null;
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

  useEffect(() => {
    const initial = volume;
    volumeRef.current = initial;
    applyVolume(initial);
    const onVolume = (event: Event) => {
      const next = clampVolume((event as CustomEvent<number>).detail);
      volumeRef.current = next;
      applyVolume(next);
      setVolumeState(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== VOLUME_KEY) return;
      const next = event.newValue === null ? DEFAULT_VOLUME : clampVolume(Number(event.newValue));
      volumeRef.current = next;
      applyVolume(next);
      setVolumeState(next);
    };
    window.addEventListener(VOLUME_EVENT, onVolume);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(VOLUME_EVENT, onVolume);
      window.removeEventListener('storage', onStorage);
    };
  }, [applyVolume, volume]);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (currentRef.current < 0 && segmentsRef.current.length) {
      playIndex(0);
    } else if (a.paused) {
      playAudio(a);
    }
  }, [playIndex, playAudio]);

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

  return { status, segments, current, rate, volume, error, play, pause, toggle, next, prev, jump, setRate, setVolume };
}
