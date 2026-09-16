import { createFileRoute } from '@tanstack/react-router';
import { CoreMessage, streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
const model = anthropic('claude-3-5-sonnet-20241022');

const SYSTEM_PROMPT = `You are a world-class DJ assistant with deep knowledge of electronic music, mixing techniques, and track selection. You help DJs find perfect tracks for their sets, provide mixing advice, and analyze music collections.

## Your Expertise:
- Electronic music genres (house, techno, trance, drum & bass, etc.)
- BPM matching and harmonic mixing
- Track transitions and energy flow
- Reading the crowd and set building
- Equipment and software recommendations

## When suggesting tracks, use this EXACT format:
"[Track Title]" - [Artist Name] ([BPM] BPM)

Examples:
"Deep Burnt" - Pépé Bradock (127 BPM)
"Strings of Life" - Derrick May (125 BPM)

## Your personality:
- Enthusiastic about music and DJing
- Knowledgeable but approachable
- Give practical, actionable advice
- Consider the user's collection and preferences
- Ask clarifying questions when needed

## Response Guidelines:
- Always suggest tracks that exist in the user's collection
- Explain WHY tracks work well together
- Consider energy levels, key compatibility, and genre flow
- Provide mixing tips when relevant
- Be concise but informative`;

export const Route = createFileRoute('/api/ai/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, tracks } = await request.json();

          if (!messages || !Array.isArray(messages)) {
            throw new Error('Invalid or missing messages array');
          }

          // Format tracks for the AI
          const formattedTracks =
            tracks?.map((track: any) => ({
              title: track.title,
              artist: track.artist,
              bpm: track.bpm,
              genre: track.genre,
            })) || [];

          const tracksContext =
            formattedTracks.length > 0
              ? `Available Tracks: ${JSON.stringify(formattedTracks)}`
              : 'No tracks available in the collection.';

          const fullMessages: CoreMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'system', content: tracksContext },
            ...messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            })),
          ];

          const result = await streamText({
            model,
            messages: fullMessages,
            temperature: 0.7,
            maxTokens: 1000,
          });

          return result.toDataStreamResponse();
        } catch (error: any) {
          console.error('Chat API error:', error);
          return new Response(
            JSON.stringify({
              error: error?.message || 'An error occurred',
              details: error?.stack,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }
      },
    },
  },
});
