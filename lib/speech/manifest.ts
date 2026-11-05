// 预生成语音的 manifest 结构

export interface SpeechSegmentManifest {
  index: number;
  text: string; // 送入 TTS 的净化文本
  hash: string; // text 的短哈希，用于增量判定
  audio: string; // 音频文件名，如 seg00.mp3（相对章节目录）
  publicUrl?: string; // 上传图床后的绝对地址（audio:upload 回写；缺省回退本地 audio）
}

export interface ChapterManifest {
  slug: string;
  model: string; // 如 fish-speech-1.5
  generatedAt: string; // ISO 时间
  segmentCount: number;
  segments: SpeechSegmentManifest[];
}

// 章节音频目录：public/audio/<slug>/
// 其中 segNN.mp3 为预生成音频，manifest.json 描述段落映射。
export const AUDIO_BASE = "/audio";

export function chapterManifestUrl(slug: string): string {
  return `${AUDIO_BASE}/${slug}/manifest.json`;
}
