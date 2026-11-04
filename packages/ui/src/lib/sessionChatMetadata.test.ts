import { describe, expect, test } from 'bun:test';
import { ensureChatsRootDirectory } from './chatDirectories';
import { opencodeClient } from './opencode/client';
import { isChatSession, withSessionSidebar } from './sessionChatMetadata';

const originalHomeInfo = opencodeClient.getFilesystemHomeInfo;
opencodeClient.getFilesystemHomeInfo = async () => ({ home: '/home/test' });
try { await ensureChatsRootDirectory(); } finally { opencodeClient.getFilesystemHomeInfo = originalHomeInfo; }

describe('Chats display ownership', () => {
  test('survives moves and a serialized reload without changing unrelated metadata', () => {
    const original = { other: 'kept', openchamber: { pinned: { at: 42 } } };
    const metadata = withSessionSidebar(original, 'chats');
    const moved = { directory: '/unregistered/worktree', metadata };
    expect(isChatSession(moved)).toBe(true);
    expect(isChatSession(JSON.parse(JSON.stringify(moved)))).toBe(true);
    expect(metadata).toEqual({ ...original, openchamber: { ...original.openchamber, sidebar: 'chats' } });
    expect(original.openchamber).toEqual({ pinned: { at: 42 } });
    expect(withSessionSidebar(metadata, 'chats')).toBe(metadata);
  });

  test('only an explicit project choice replaces Chats ownership', () => {
    const metadata = withSessionSidebar(withSessionSidebar({}, 'chats'), 'project');
    expect(isChatSession({ directory: '/project', metadata })).toBe(false);
    expect(isChatSession({ directory: '/home/test/.config/openchamber/chats/day/session', metadata })).toBe(false);
  });

  test('legacy and invalid metadata use the directory rule', () => {
    const directory = '/home/test/.config/openchamber/chats/day/session';
    expect(isChatSession({ directory })).toBe(true);
    expect(isChatSession({ directory, metadata: { openchamber: { sidebar: 'invalid' } } })).toBe(true);
    expect(isChatSession({ directory: '/unregistered/project' })).toBe(false);
    expect(isChatSession({ directory: '/project', metadata: { openchamber: false } })).toBe(false);
  });
});
