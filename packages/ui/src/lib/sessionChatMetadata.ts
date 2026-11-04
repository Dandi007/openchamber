import { z } from 'zod';
import type { Metadata, Session } from '@/lib/opencode/model';
import { isChatDirectoryPath } from '@/lib/chatDirectories';

const sidebarSchema = z.object({ openchamber: z.object({ sidebar: z.enum(['chats', 'project']) }) });
const namespaceSchema = z.object({ openchamber: z.record(z.string(), z.json()) });

/** Display ownership survives OpenCode moves; directory remains the execution location. */
export function isChatSession(session: Pick<Session, 'directory' | 'metadata'>): boolean {
  const sidebar = sidebarSchema.safeParse(session.metadata).data?.openchamber.sidebar;
  return sidebar ? sidebar === 'chats' : isChatDirectoryPath(session.directory);
}

/** Keep unrelated metadata when creating a chat or explicitly promoting it to a project. */
export function withSessionSidebar(metadata: Metadata, sidebar: 'chats' | 'project'): Metadata {
  const namespace = namespaceSchema.safeParse(metadata).data?.openchamber ?? {};
  if (namespace.sidebar === sidebar) return metadata;
  return { ...metadata, openchamber: { ...namespace, sidebar } };
}
