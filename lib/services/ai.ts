import Messages from '@anthropic-ai/sdk';

export async function sendMessageToClaude(
  messages: Messages,
  collection: any[],
) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      collection: collection.map((item) => ({
        title: item.basic_information.title,
        artist: item.basic_information.artists[0].name,
        year: item.basic_information.year,
        genres: item.basic_information.genres,
        styles: item.basic_information.styles,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message to Claude');
  }

  return response.json();
}
