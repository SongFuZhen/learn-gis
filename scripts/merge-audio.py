"""把章节分段 mp3 合并为单文件（KV 写次数优化：一章一文件），并给 manifest 段落加 start/duration。

拼接是 mp3 帧级操作，必须剥离会"撒谎"的元数据，否则合并文件会被解码器提前截断：
- ID3v2（段首标签块）
- Xing/Info VBR 头帧（第一帧内声明本段流长度，拼接后对整条流是错的 → libsndfile/部分浏览器只播 2 秒）
- ID3v1（段尾 128 字节 TAG）
剥离后为无头 CBR 帧流，时长 = 帧数 × 每帧样本数，所有解码器都能读全。

适用范围（自动识别，幂等）：
- manifest 已有 merged → 跳过（--force 重跑）
- 段落已全部带 publicUrl（如 GIS 17 章逐段发布）→ 跳过，不动已发布内容

用法：F:/Codes/fish-tts/repo/.venv/Scripts/python.exe scripts/merge-audio.py
依赖：soundfile（fish-tts venv 自带），用于读取分段 mp3 的精确时长。
"""
import glob
import json
import os
import sys

import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_ROOT = os.path.join(ROOT, "public", "audio")
FORCE = "--force" in sys.argv

BITRATE_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
BITRATE_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
SAMPLE_V1 = [44100, 48000, 32000, 0]
SAMPLE_V2 = [22050, 24000, 16000, 11025, 12000, 8000, 0, 0]


def strip_id3v2(data: bytes) -> bytes:
    if data[:3] != b"ID3":
        return data
    size = (data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9]
    return data[10 + size:]


def parse_frame(data: bytes, i: int):
    """解析 i 处的 MPEG 帧头，返回 (帧长, 是否 Xing/Info 头帧) 或 None。"""
    if i + 4 > len(data):
        return None
    b1, b2, b3, b4 = data[i], data[i + 1], data[i + 2], data[i + 3]
    if b1 != 0xFF or (b2 & 0xE0) != 0xE0:
        return None
    version = (b2 >> 3) & 3  # 3=MPEG1, 2=MPEG2, 0=MPEG2.5
    layer = (b2 >> 1) & 3  # 1 = Layer III
    bitrate_i = (b3 >> 4) & 0xF
    sr_i = (b3 >> 2) & 3
    padding = (b3 >> 1) & 1
    if version in (0, 1) or layer != 1 or bitrate_i in (0, 15) or sr_i == 3:
        return None
    mode = (b4 >> 6) & 3  # 3 = mono
    if version == 3:
        bitrate = BITRATE_V1_L3[bitrate_i] * 1000
        sr = SAMPLE_V1[sr_i]
        side_info = 17 if mode == 3 else 32
        flen = 144 * bitrate // sr + padding
    else:
        bitrate = BITRATE_V2_L3[bitrate_i] * 1000
        sr = SAMPLE_V2[sr_i]
        side_info = 9 if mode == 3 else 17
        flen = 72 * bitrate // sr + padding
    is_xing = data[i + 4 + side_info: i + 8 + side_info] in (b"Xing", b"Info")
    return flen, is_xing


def clean_part(part: bytes, strip_id3: bool) -> bytes:
    """剥 ID3v2/ID3v1 标签，保留全部帧（含 Xing/Info 帧）。

    关键认知：拼接的正确性 = 帧字节流连续。Xing/Info 帧是合法帧，保留不影响
    解码（浏览器逐帧解码到 EOF）；剥离它反而会因帧长计算误差破坏对齐。
    libsndfile 会被首段 Xing 头骗到（info 只报首段时长），那是它的局限，
    验证时长要用帧遍历（walk_frames），不能信 libsndfile 的 info。
    """
    if not strip_id3:
        return part
    part = strip_id3v2(part)
    if len(part) > 128 and part[-128:-125] == b"TAG":
        part = part[:-128]
    return part


def main() -> None:
    merged_count = skipped = 0
    for mf in sorted(glob.glob(os.path.join(AUDIO_ROOT, "*", "manifest.json"))):
        chapter_dir = os.path.dirname(mf)
        slug = os.path.basename(chapter_dir)
        with open(mf, encoding="utf8") as fh:
            m = json.load(fh)

        if m.get("merged") and not FORCE:
            skipped += 1
            continue
        # 已逐段发布（全部带 publicUrl）的章节不动
        if m["segments"] and all(s.get("publicUrl") for s in m["segments"]):
            skipped += 1
            continue

        parts, durations = [], []
        for seg in m["segments"]:
            path = os.path.join(chapter_dir, seg["audio"])
            if not os.path.exists(path):
                print(f"缺分段 mp3，跳过整章 {slug}: {seg['audio']}")
                break
            # 段时长用帧遍历（含 Xing 帧）：与拼接后的字节时间线严格一致；
            # sf.info 会被 Xing 头骗到，且不含 Xing 帧，累计会漂移 ~2.5s/章
            _, dur = walk_frames(path)
            durations.append(dur)
            parts.append(open(path, "rb").read())
        else:
            starts = [sum(durations[:i]) for i in range(len(durations))]
            for seg, start, dur in zip(m["segments"], starts, durations):
                seg["start"] = round(start, 3)
                seg["duration"] = round(dur, 3)

            out_name = "chapter.mp3"
            with open(os.path.join(chapter_dir, out_name), "wb") as fh:
                fh.write(parts[0])
                fh.write(b"".join(clean_part(p, strip_id3=True) for p in parts[1:]))

            merged = m.get("merged") or {"audio": out_name}
            merged["audio"] = out_name
            merged.pop("publicUrl", None)
            m["merged"] = merged
            with open(mf, "w", encoding="utf8", newline="\n") as fh:
                json.dump(m, fh, ensure_ascii=False, indent=2)
                fh.write("\n")
            print(f"{slug}: {len(m['segments'])} 段合并 → {out_name}（{sum(durations)/60:.1f} 分钟）")
            merged_count += 1

    print(f"--- 合并 {merged_count} 章，跳过 {skipped} 章")


def walk_frames(path: str):
    """逐帧遍历 mp3，返回 (帧数, 总时长秒)。解不出来处跳 1 字节重同步（解码器同款行为）。"""
    data = open(path, "rb").read()
    frames = 0
    samples = 0
    i = 0
    sr = None
    while i < len(data) - 4:
        r = parse_frame(data, i)
        if r is None:
            i += 1  # 重同步
            continue
        flen, _ = r
        if i + flen > len(data):
            break
        b2, b3 = data[i + 1], data[i + 2]
        version = (b2 >> 3) & 3
        sr_i = (b3 >> 2) & 3
        cur_sr = (SAMPLE_V1 if version == 3 else SAMPLE_V2)[sr_i]
        if sr is None:
            sr = cur_sr
        frames += 1
        samples += 1152 if version == 3 else 576
        i += flen
    return frames, samples / sr if sr else 0.0


if __name__ == "__main__":
    main()
