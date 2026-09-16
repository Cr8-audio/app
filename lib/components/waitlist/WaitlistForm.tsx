'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/lib/components/ui/button';
import { Input } from '@/lib/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/lib/components/ui/form';
import { waitlistSchema } from '@/lib/schemas/waitlistSchema';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/lib/components/ui/select';

const WaitListForm: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addToWaitlist = useMutation(api.waitlist.addToWaitlist);

  const form = useForm({
    resolver: zodResolver(waitlistSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      user_type: 'DJ',
    },
  });

  const handleSubmit = async (data: any) => {
    try {
      const result = await addToWaitlist({
        email: data.email,
        user_type: data.user_type,
      });

      setMessage(result.message);
      setError(null);

      setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
      form.reset(); // Reset the form after successful submission
    } catch (error) {
      setMessage(null);
      setError('Failed to add to waitlist');
      console.error('Error submitting form', error);

      setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
    }
  };

  return (
    <div
      className="max-w-lg mx-auto p-8 bg-white text-black rounded-lg"
      style={{
        backgroundImage: 'radial-gradient(#FFDC58 1px, transparent 1px)',
        backgroundSize: '10px 10px',
      }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    {...field}
                    required
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="user_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What kind of digger are you?</FormLabel>
                <FormControl>
                  <Controller
                    name="user_type"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) => field.onChange(value)}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DJ">DJ</SelectItem>
                          <SelectItem value="Record Store">
                            Record Store
                          </SelectItem>
                          <SelectItem value="Record Collector">
                            Record Collector
                          </SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            variant="default"
            className="w-full font-mono text-small-title"
            disabled={!form.formState.isValid}
          >
            Join Waitlist
          </Button>
          {message && (
            <div className="text-center text-green-600 mt-4 animate-pulse font-mono text-small-subtitle">
              <p>{message}</p>
              <img
                src="/Brut164.svg"
                alt="Success Icon"
                width={50}
                height={50}
                className="mx-auto mt-2"
              />
            </div>
          )}
          {error && (
            <p className="text-center text-red-600 mt-4 animate-pulse font-mono text-small-subtitle">
              {error}
            </p>
          )}
        </form>
      </Form>
    </div>
  );
};

export default WaitListForm;
