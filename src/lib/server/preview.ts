import { join } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const UPLOAD_DIR = join(process.cwd(), "uploads");

const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma", "opus", "webm"]);

function getAudioCategory(ext: string): string {
  return AUDIO_EXTS.has(ext) ? "audio" : "";
}

export function getDocumentCategory(type: string, originalName: string): string {
  if (type === "text/csv") return "csv";
  if (type === "text/markdown") return "md";
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/plain": "txt",
    "application/msword": "doc",
    "application/vnd.ms-excel": "xls",
  };
  if (mimeMap[type]) return mimeMap[type];

  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, string> = {
    pdf: "pdf", docx: "docx", xlsx: "xlsx", txt: "txt",
    doc: "docx", xls: "xlsx",
    md: "md", csv: "csv",
  };
  const cat = extMap[ext];
  if (cat) return cat;

  const audioCat = getAudioCategory(ext);
  if (audioCat) return audioCat;

  return "other";
}

export function isDocumentType(type: string, originalName: string): boolean {
  return ["pdf", "docx", "xlsx", "txt", "doc", "xls", "md", "csv", "audio"].includes(getDocumentCategory(type, originalName));
}

function getSvg(type: string, filename: string): string {
  const colors: Record<string, { bg: string; accent: string; label: string; labelBg: string }> = {
    pdf: { bg: "#fff5f5", accent: "#e74c3c", label: "PDF", labelBg: "#e74c3c" },
    docx: { bg: "#f0f7ff", accent: "#2980b9", label: "DOC", labelBg: "#2980b9" },
    xlsx: { bg: "#f0faf0", accent: "#27ae60", label: "XLS", labelBg: "#27ae60" },
    txt: { bg: "#f7f7f7", accent: "#7f8c8d", label: "TXT", labelBg: "#7f8c8d" },
    md: { bg: "#fef9ef", accent: "#e67e22", label: "MD", labelBg: "#e67e22" },
    csv: { bg: "#f0f7f0", accent: "#1abc9c", label: "CSV", labelBg: "#1abc9c" },
    audio: { bg: "#f5f0ff", accent: "#8e44ad", label: "AUDIO", labelBg: "#8e44ad" },
  };
  const c = colors[type] || { bg: "#f7f7f7", accent: "#95a5a6", label: "FILE", labelBg: "#95a5a6" };

  const name = filename.replace(/\.\w+$/, "").slice(0, 30);

  const musicSvg = type === "audio" ? `
    <circle cx="400" cy="380" r="80" fill="none" stroke="${c.accent}" stroke-width="6"/>
    <circle cx="370" cy="380" r="50" fill="none" stroke="${c.accent}" stroke-width="4"/>
    <polygon points="430,340 520,310 520,440 430,420" fill="${c.accent}" opacity="0.8"/>` : `
    <rect x="280" y="240" width="240" height="280" rx="16" fill="white" stroke="${c.accent}" stroke-width="4"/>
    <rect x="360" y="240" width="160" height="40" rx="4" fill="${c.accent}" opacity="0.3"/>
    <line x1="340" y1="340" x2="460" y2="340" stroke="${c.accent}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
    <line x1="340" y1="370" x2="440" y2="370" stroke="${c.accent}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
    <line x1="340" y1="400" x2="460" y2="400" stroke="${c.accent}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
    <line x1="340" y1="430" x2="420" y2="430" stroke="${c.accent}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="${c.bg}" rx="16"/>
    <rect x="0" y="0" width="12" height="800" fill="${c.accent}" rx="6"/>
    ${musicSvg}
    <text x="400" y="580" font-family="sans-serif" font-size="28" fill="#333" text-anchor="middle">${escapeXml(name)}</text>
    <rect x="310" y="620" width="180" height="40" rx="20" fill="${c.labelBg}"/>
    <text x="400" y="647" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="bold">${c.label}</text>
  </svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function generateDocumentPreview(
  storedName: string,
  originalName: string,
  type: string,
): Promise<boolean> {
  const cat = getDocumentCategory(type, originalName);
  if (cat === "other") return false;

  try {
    await mkdir(join(UPLOAD_DIR, "previews"), { recursive: true });
    const sharp = (await import("sharp")).default;
    const svg = getSvg(cat, originalName);
    await sharp(Buffer.from(svg))
      .resize(400, 400, { fit: "inside" })
      .webp({ quality: 70 })
      .toFile(join(UPLOAD_DIR, "previews", `${storedName}.webp`));
    return true;
  } catch {
    return false;
  }
}
