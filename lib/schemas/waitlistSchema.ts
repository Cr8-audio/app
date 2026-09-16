import { z } from 'zod';

export const waitlistSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  user_type: z.enum(['DJ', 'Record Store', 'Record Collector', 'Other']),
});
