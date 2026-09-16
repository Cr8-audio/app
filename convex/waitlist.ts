import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Add an email to the waitlist
 */
export const addToWaitlist = mutation({
  args: {
    email: v.string(),
    user_type: v.string(),
  },
  handler: async (ctx, { email, user_type }) => {
    // Check if email already exists
    const existing = await ctx.db
      .query('waitlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    if (existing) {
      return { success: true, message: 'Email already on waitlist' };
    }

    await ctx.db.insert('waitlist', {
      email,
      user_type,
    });

    return { success: true, message: 'Successfully added to waitlist!' };
  },
});

/**
 * Check if an email is on the waitlist
 */
export const isOnWaitlist = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const entry = await ctx.db
      .query('waitlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    return !!entry;
  },
});
