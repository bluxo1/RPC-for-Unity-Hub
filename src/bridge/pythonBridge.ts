import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { UnityHubState } from '../presence/transformer.js';
export class PythonBridge {
  private child?: ChildProcess;
  private attempts = 0;
  constructor(private readonly onState: (state: UnityHubState) => void, private readonly intervalMs = 5000) {}
  start(): void {
    const child = spawn(process.env.PYTHON ?? 'python', ['python/state_monitor.py', '--interval-ms', String(this.intervalMs)], { stdio: ['ignore', 'pipe', 'inherit'] });
    this.child = child;
    if (!child.stdout) return;
    createInterface({ input: child.stdout }).on('line', (line) => { try { this.onState(JSON.parse(line) as UnityHubState); } catch { /* ignore malformed poll output */ } });
    child.once('exit', () => { if (this.attempts++ < 5) setTimeout(() => this.start(), Math.min(30000, 500 * 2 ** this.attempts)); });
  }
  stop(): void { this.child?.kill(); }
}
