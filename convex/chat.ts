/**
 * Durable DJ Assistant chat via @convex-dev/agent.
 * Messages/threads live in the agent component — no homemade message tables.
 * Ready for #98 tools on the same thread; do not invent a second chat stack.
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import {
  createThread,
  getThreadMetadata,
  listMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from '@convex-dev/agent';
import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { components, internal } from './_generated/api';
import {
  internalAction,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import {
  DJ_ASSISTANT_THREAD_TITLE,
  SYSTEM_PROMPT,
  djAgent,
} from './agents/djAssistant';

type ThreadCtx = QueryCtx | MutationCtx | ActionCtx;

async function requireUserId(ctx: ThreadCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}

export async function authorizeThreadAccess(
  ctx: ThreadCtx,
  threadId: string,
): Promise<string> {
  const userId = await requireUserId(ctx);
  const { userId: threadUserId } = await getThreadMetadata(
    ctx,
    components.agent,
    { threadId },
  );
  if (threadUserId !== userId) {
    throw new Error('Unauthorized: thread does not belong to user');
  }
  return userId;
}

/**
 * Signed-in user's durable DJ Assistant thread (survives refresh).
 * Reuses existing titled thread when present; otherwise creates one.
 */
export const getOrCreateChatThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    const existing = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId,
        order: 'desc',
        paginationOpts: { cursor: null, numItems: 50 },
      },
    );

    const match = existing.page.find(
      (t) => t.title === DJ_ASSISTANT_THREAD_TITLE && t.status === 'active',
    );
    if (match) {
      return { threadId: match._id };
    }

    const threadId = await createThread(ctx, components.agent, {
      userId,
      title: DJ_ASSISTANT_THREAD_TITLE,
    });
    return { threadId };
  },
});

/**
 * List messages for a thread (UI + optional stream deltas).
 */
export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    await authorizeThreadAccess(ctx, args.threadId);

    const paginated = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
      excludeToolMessages: true,
    });

    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });

    return { ...paginated, streams };
  },
});

const trackContextValidator = v.object({
  title: v.string(),
  artist: v.string(),
  bpm: v.optional(v.number()),
  genres: v.optional(v.array(v.string())),
});

/**
 * Save user message via agent component, then generate reply async.
 */
export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    tracks: v.optional(v.array(trackContextValidator)),
  },
  handler: async (ctx, { threadId, prompt, tracks }) => {
    await authorizeThreadAccess(ctx, threadId);

    const trimmed = prompt.trim();
    if (!trimmed) {
      throw new Error('Prompt is empty');
    }

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      prompt: trimmed,
    });

    await ctx.scheduler.runAfter(0, internal.chat.generateResponse, {
      threadId,
      promptMessageId: messageId,
      tracks,
    });

    return { messageId };
  },
});

export const generateResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    tracks: v.optional(v.array(trackContextValidator)),
  },
  handler: async (ctx, { threadId, promptMessageId, tracks }) => {
    const tracksContext =
      tracks && tracks.length > 0
        ? `\n\nAvailable Tracks in the user's collection:\n${JSON.stringify(tracks)}`
        : '\n\nNo tracks available in the collection.';

    await djAgent.generateText(
      ctx,
      { threadId },
      {
        promptMessageId,
        system: SYSTEM_PROMPT + tracksContext,
      },
    );
  },
});
