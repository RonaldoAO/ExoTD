// job-queue.ts — cola global con rate-limit
type Task<T> = () => Promise<T>;

class JobQueue {
  private queue: Array<{ run: Task<any>, resolve: (v:any)=>void, reject: (e:any)=>void }> = [];
  private running = false;
  private minIntervalMs: number;
  private lastRun = 0;

  constructor(minIntervalMs: number) {
    this.minIntervalMs = minIntervalMs;
  }

  setMinInterval(ms: number) { this.minIntervalMs = Math.max(0, ms); }

  enqueue<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ run: task, resolve, reject });
      this.kick();
    });
  }

  private async kick() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const now = Date.now();
        const wait = Math.max(0, this.lastRun + this.minIntervalMs - now);
        if (wait > 0) await new Promise(res => setTimeout(res, wait));

        const item = this.queue.shift()!;
        try {
          this.lastRun = Date.now();
          const out = await item.run();
          item.resolve(out);
        } catch (e: any) {
          // Si es rate-limit, respeta su Retry-After y re-enfila al frente
          if (e?.name === "RateLimitError" && typeof e.retryAfterMs === "number") {
            // espera adicional y reintenta el MISMO task
            await new Promise(res => setTimeout(res, e.retryAfterMs));
            this.queue.unshift(item); // reinsertar al frente
          } else {
            item.reject(e);
          }
        }
      }
    } finally {
      this.running = false;
    }
  }
}

// Exporta la cola global: por defecto 1 job cada 25s
export const imageQueue = new JobQueue(25000);
