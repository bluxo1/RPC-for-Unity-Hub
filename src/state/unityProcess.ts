import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { platform } from 'node:os';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** A Unity install directory is named after its exact editor version. */
const VERSION_SEGMENT = /^\d+\.\d+\.\d+(?:[abfpx]\d+)?$/;
const PROJECT_PATH_ARG = /-projectpath\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i;
const EDITOR_VERSION_LINE = /^m_EditorVersion:\s*(\S+)/m;

export interface UnityProcess {
  /** Absolute path to the open project, as Unity itself was told to load it. */
  projectPath: string;
  /** Editor version taken from the executable path, when it encodes one. */
  version: string | null;
}

export interface RawProcess {
  name: string;
  executablePath: string | null;
  commandLine: string | null;
}

export function parseProjectPathArg(commandLine: string | null): string | null {
  const match = commandLine ? PROJECT_PATH_ARG.exec(commandLine) : null;
  const value = match ? (match[1] ?? match[2] ?? match[3]) : null;
  return value && value.length > 0 ? value : null;
}

export function parseEditorVersion(
  executablePath: string | null,
): string | null {
  if (!executablePath) return null;
  return (
    executablePath
      .split(/[\\/]+/)
      .find((segment) => VERSION_SEGMENT.test(segment)) ?? null
  );
}

/**
 * Unity reports the path in its own OS's flavour, which is not necessarily the flavour
 * `node:path` resolves to, so split on both separators rather than trusting the host.
 */
export function parseProjectName(projectPath: string): string {
  const segments = projectPath.split(/[\\/]+/).filter((s) => s.length > 0);
  return segments[segments.length - 1] ?? projectPath;
}

/** Authoritative version for a project, written by the editor that last opened it. */
export async function readProjectVersion(
  projectPath: string,
): Promise<string | null> {
  try {
    const raw = await readFile(
      `${projectPath.replace(/[\\/]+$/, '')}/ProjectSettings/ProjectVersion.txt`,
      'utf8',
    );
    return EDITOR_VERSION_LINE.exec(raw)?.[1] ?? null;
  } catch {
    return null;
  }
}

function normalizeCimOutput(stdout: string): RawProcess[] {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) return [];
  const parsed = JSON.parse(trimmed) as unknown;
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .filter(
      (row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === 'object',
    )
    .map((row) => ({
      name: typeof row.Name === 'string' ? row.Name : '',
      executablePath:
        typeof row.ExecutablePath === 'string' ? row.ExecutablePath : null,
      commandLine: typeof row.CommandLine === 'string' ? row.CommandLine : null,
    }));
}

export function parsePosixProcessLines(stdout: string): RawProcess[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && /unity/i.test(line))
    .map((line) => ({
      name: /unity hub/i.test(line) ? 'Unity Hub' : 'Unity',
      executablePath: line.split(/\s+/)[0] ?? null,
      commandLine: line,
    }));
}

async function listProcesses(): Promise<RawProcess[]> {
  if (platform() === 'win32') {
    // wmic is gone on current Windows builds, so CIM is the only way to read command lines.
    const script =
      "Get-CimInstance Win32_Process -Filter \"Name='Unity.exe' OR Name='Unity Hub.exe'\" | Select-Object Name,ExecutablePath,CommandLine | ConvertTo-Json -Compress";
    const { stdout } = await run(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script,
      ],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    return normalizeCimOutput(stdout);
  }
  const { stdout } = await run('ps', ['-Ao', 'command='], {
    maxBuffer: 4 * 1024 * 1024,
  });
  return parsePosixProcessLines(stdout);
}

const isHub = (process: RawProcess): boolean =>
  /unity ?hub/i.test(process.name) ||
  /unity ?hub/i.test(process.commandLine ?? '');

/** The editor process, not the Hub, is what tells us a project is genuinely open. */
export function selectUnityEditor(
  processes: RawProcess[],
): UnityProcess | null {
  for (const candidate of processes) {
    if (isHub(candidate)) continue;
    const projectPath = parseProjectPathArg(candidate.commandLine);
    if (projectPath)
      return {
        projectPath,
        version: parseEditorVersion(candidate.executablePath),
      };
  }
  return null;
}

export function hasHubProcess(processes: RawProcess[]): boolean {
  return processes.some(isHub);
}

export interface UnityRuntime {
  editor: UnityProcess | null;
  hubRunning: boolean;
}

export async function readUnityRuntime(): Promise<UnityRuntime> {
  try {
    const processes = await listProcesses();
    return {
      editor: selectUnityEditor(processes),
      hubRunning: hasHubProcess(processes),
    };
  } catch {
    // A failed process query must look like "nothing open", never crash the daemon.
    return { editor: null, hubRunning: false };
  }
}
