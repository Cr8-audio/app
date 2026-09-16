import { Email } from '@convex-dev/auth/providers/Email';
import { Resend as ResendAPI } from 'resend';
import { RandomReader, generateRandomString } from '@oslojs/crypto/random';

export const ResendOTP = Email({
  id: 'resend-otp',
  apiKey: process.env.AUTH_RESEND_KEY || '',
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    const alphabet = '0123456789';
    const length = 8;
    return generateRandomString(random, alphabet, length);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      throw new Error('AUTH_RESEND_KEY environment variable is not set');
    }

    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from: 'My App <onboarding@crate.audio>',
      to: [email],
      subject: `Sign in to crate`,
      text: 'Your code is ' + token,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
