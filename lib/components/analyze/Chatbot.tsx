'use client';

import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/lib/components/ui/button';
import { Input } from '@/lib/components/ui/input';
import { Card } from '@/lib/components/ui/card';
import { useDiscogsCollection } from '@/lib/hooks/useDiscogsCollection';
import { useCompletion, useChat } from 'ai/react';

export const Chatbot = () => {
  const { collection } = useDiscogsCollection();
  const [messages, setMessages] = React.useState([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hey DJ! Tell me about your gig - what type of venue, time slot, and vibe you're aiming for. I'll suggest tracks from your collection.",
    },
  ]);

  const { completion, complete, input, handleInputChange, isLoading } =
    useCompletion({
      api: '/api/ai/chat',
      body: {
        collection: collection?.map((item) => ({
          title: item.basic_information.title,
          artist: item.basic_information.artists[0].name,
          year: item.basic_information.year,
          genres: item.basic_information.genres,
          styles: item.basic_information.styles,
        })),
      },
      onFinish: (prompt, completion) => {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'user', content: prompt },
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: completion,
          },
        ]);
      },
      onError: (error) => {
        console.error('Chat error:', error);
      },
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await complete(input);
    handleInputChange({
      target: { value: '' },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              {completion || 'Thinking...'}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
};
