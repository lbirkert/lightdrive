import { EventEmitter } from "events";
import { prisma } from "$lib/server/db";
import { transcodeVideo } from "$lib/server/transcode";

interface Job {
  fileId: string;
  storedName: string;
}

class TranscodeWorker extends EventEmitter {
  private queue: Job[] = [];
  private pending = new Set<string>();
  private processing = false;

  enqueue(fileId: string, storedName: string): void {
    if (this.pending.has(fileId)) return;
    this.pending.add(fileId);
    this.queue.push({ fileId, storedName });
    console.log(`[worker] enqueued ${storedName} (fileId=${fileId})`);
    this.processNext();
  }

  isPending(fileId: string): boolean {
    return this.pending.has(fileId);
  }

  waitFor(fileId: string): Promise<boolean> {
    if (!this.pending.has(fileId)) return Promise.resolve(false);
    return new Promise((resolve) => {
      this.once(`done:${fileId}`, (success: boolean) => resolve(success));
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const job = this.queue.shift()!;
    console.log(`[worker] processing ${job.storedName}`);
    try {
      const result = await transcodeVideo(job.storedName);
      if (result) {
        await prisma.file.update({
          where: { id: job.fileId },
          data: { transcodedName: result },
        });
        console.log(`[worker] done ${job.storedName} -> ${result}`);
      }
      this.emit(`done:${job.fileId}`, result !== null);
    } catch (e) {
      console.log(`[worker] error ${job.storedName}:`, e);
      this.emit(`done:${job.fileId}`, false);
    } finally {
      this.pending.delete(job.fileId);
      this.processing = false;
      this.processNext();
    }
  }
}

export const worker = new TranscodeWorker();
