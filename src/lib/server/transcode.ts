import { execFile } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

const UPLOAD_DIR = join(process.cwd(), "uploads");

const VIDEO_EXTS = new Set(["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv", "m4v", "mpg", "mpeg", "3gp"]);
const VIDEO_MIMES = new Set([
  "video/mp4", "video/webm", "video/x-matroska", "video/avi", "video/x-msvideo",
  "video/quicktime", "video/x-ms-wmv", "video/x-flv", "video/mpeg", "video/3gpp",
  "video/x-m4v",
]);

const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma", "opus", "webm"]);

export function isVideo(mime: string, originalName: string): boolean {
  if (VIDEO_MIMES.has(mime)) return true;
  const ext = originalName.split(".").pop()?.toLowerCase();
  return ext ? VIDEO_EXTS.has(ext) : false;
}

export function isAudio(mime: string, originalName: string): boolean {
  const AUDIO_MIMES = new Set([
    "audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac", "audio/x-flac",
    "audio/ogg", "audio/aac", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/opus",
  ]);
  if (AUDIO_MIMES.has(mime)) return true;
  const ext = originalName.split(".").pop()?.toLowerCase();
  return ext ? AUDIO_EXTS.has(ext) : false;
}

function ffmpeg(...args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile("ffmpeg", args, (err) => {
      if (err) reject(err);
      else resolve();
    });
    child.stderr?.on("data", (d) => process.stderr.write(d));
  });
}

export async function transcodeVideo(storedName: string): Promise<string | null> {
  const input = join(UPLOAD_DIR, storedName);
  const transcodedDir = join(UPLOAD_DIR, "transcoded");
  await mkdir(transcodedDir, { recursive: true });

  const outputName = `${storedName}.webm`;
  const output = join(transcodedDir, outputName);

  const args = [
    "-i", input,
    "-c:v", "libvpx-vp9",
    "-crf", "50",
    "-b:v", "0",
    "-cpu-used", "0",
    "-deadline", "good",
    "-row-mt", "1",
    "-vf", "scale=640:360:force_original_aspect_ratio=decrease",
    "-c:a", "libopus",
    "-b:a", "32k",
    "-y", output,
  ];

  console.log(`[transcode] starting ${outputName}`);
  try {
    await ffmpeg(...args);
    console.log(`[transcode] done ${outputName}`);
    return outputName;
  } catch (e) {
    console.log(`[transcode] failed ${outputName}:`, e);
    return null;
  }
}

export function getTranscodedPath(storedName: string, quality?: string): string {
  return join("transcoded", `${storedName}.webm`);
}

export async function transcodeAudio(storedName: string): Promise<string | null> {
  const input = join(UPLOAD_DIR, storedName);
  const transcodedDir = join(UPLOAD_DIR, "transcoded");
  await mkdir(transcodedDir, { recursive: true });

  const outputName = `${storedName}.m4a`;
  const output = join(transcodedDir, outputName);

  try {
    await ffmpeg(
      "-i", input,
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y", output,
    );
    return outputName;
  } catch {
    return null;
  }
}

export async function generateVideoThumbnail(storedName: string): Promise<boolean> {
  const input = join(UPLOAD_DIR, storedName);
  const previewsDir = join(UPLOAD_DIR, "previews");
  await mkdir(previewsDir, { recursive: true });

  const output = join(previewsDir, `${storedName}.webp`);

  try {
    await ffmpeg(
      "-i", input,
      "-ss", "00:00:05",
      "-vframes", "1",
      "-vf", "scale=800:800:force_original_aspect_ratio=increase,crop=800:800",
      "-y", output,
    );
    return true;
  } catch {
    return false;
  }
}

export function simplifyMimeForDisplay(mime: string): string {
  if (mime.startsWith("video/")) {
    return "video/webm";
  }
  if (mime.startsWith("audio/")) {
    return "audio/mp4";
  }
  return mime;
}
