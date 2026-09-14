import { describe, expect, it } from 'vitest';
import {
  hasHubProcess,
  parseEditorVersion,
  parsePosixProcessLines,
  parseProjectPathArg,
  selectUnityEditor,
} from '../../src/state/unityProcess.js';

describe('parseProjectPathArg', () => {
  it('reads a quoted path containing spaces', () => {
    expect(
      parseProjectPathArg(
        '"C:\\Unity\\Editor\\Unity.exe" -projectPath "C:\\Games\\My Game"',
      ),
    ).toBe('C:\\Games\\My Game');
  });

  it('reads an unquoted path', () => {
    expect(
      parseProjectPathArg('Unity.exe -projectPath C:\\Games\\SpaceGame'),
    ).toBe('C:\\Games\\SpaceGame');
  });

  it('matches the flag case-insensitively', () => {
    expect(
      parseProjectPathArg('Unity.exe -projectpath "C:\\Games\\SpaceGame"'),
    ).toBe('C:\\Games\\SpaceGame');
  });

  it('returns null without the flag', () => {
    expect(parseProjectPathArg('Unity.exe -batchmode')).toBeNull();
    expect(parseProjectPathArg(null)).toBeNull();
  });
});

describe('parseEditorVersion', () => {
  it('reads the version from a hub install path', () => {
    expect(
      parseEditorVersion(
        'C:\\Program Files\\Unity\\Hub\\Editor\\2022.3.42f1\\Editor\\Unity.exe',
      ),
    ).toBe('2022.3.42f1');
  });

  it('reads a Unity 6 version', () => {
    expect(
      parseEditorVersion(
        'C:\\Unity\\Hub\\Editor\\6000.0.58f1\\Editor\\Unity.exe',
      ),
    ).toBe('6000.0.58f1');
  });

  it('reads a beta version', () => {
    expect(
      parseEditorVersion(
        '/Applications/Unity/Hub/Editor/2023.1.0b12/Unity.app/Contents/MacOS/Unity',
      ),
    ).toBe('2023.1.0b12');
  });

  it('returns null when the path encodes no version', () => {
    expect(parseEditorVersion('C:\\Custom\\Unity\\Unity.exe')).toBeNull();
    expect(parseEditorVersion(null)).toBeNull();
  });
});

describe('selectUnityEditor', () => {
  const hub = {
    name: 'Unity Hub.exe',
    executablePath: 'C:\\Program Files\\Unity Hub\\Unity Hub.exe',
    commandLine: '"C:\\Program Files\\Unity Hub\\Unity Hub.exe"',
  };
  const editor = {
    name: 'Unity.exe',
    executablePath: 'C:\\Unity\\Hub\\Editor\\2022.3.42f1\\Editor\\Unity.exe',
    commandLine: '"Unity.exe" -projectPath "C:\\Games\\SpaceGame"',
  };

  it('picks the editor and ignores the hub', () => {
    expect(selectUnityEditor([hub, editor])).toEqual({
      projectPath: 'C:\\Games\\SpaceGame',
      version: '2022.3.42f1',
    });
  });

  it('returns null when only the hub is running', () => {
    expect(selectUnityEditor([hub])).toBeNull();
  });

  it('ignores an editor started without a project', () => {
    expect(
      selectUnityEditor([
        { ...editor, commandLine: '"Unity.exe" -createManualActivationFile' },
      ]),
    ).toBeNull();
  });

  it('detects the hub only when present', () => {
    expect(hasHubProcess([hub, editor])).toBe(true);
    expect(hasHubProcess([editor])).toBe(false);
  });
});

describe('parsePosixProcessLines', () => {
  it('keeps Unity lines and drops everything else', () => {
    const stdout = [
      '/usr/bin/bash',
      '/Applications/Unity/Hub/Editor/2022.3.42f1/Unity.app/Contents/MacOS/Unity -projectPath /Users/me/SpaceGame',
      '/Applications/Unity Hub.app/Contents/MacOS/Unity Hub',
    ].join('\n');
    const rows = parsePosixProcessLines(stdout);
    expect(rows).toHaveLength(2);
    expect(selectUnityEditor(rows)).toEqual({
      projectPath: '/Users/me/SpaceGame',
      version: '2022.3.42f1',
    });
    expect(hasHubProcess(rows)).toBe(true);
  });
});
