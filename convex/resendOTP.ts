import { Email } from '@convex-dev/auth/providers/Email';
import { Resend as ResendAPI } from 'resend';
import { RandomReader, generateRandomString } from '@oslojs/crypto/random';

/**
 * Sender for sign-in codes. Must be on a domain verified in Resend, e.g.
 * `Crate <login@cr8.audio>`. Resend's shared test sender (the fallback) needs
 * no verified domain but only delivers to the Resend account owner's email.
 */
const DEFAULT_FROM = 'Crate <onboarding@resend.dev>';

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
      from: process.env.AUTH_EMAIL_FROM || DEFAULT_FROM,
      to: [email],
      subject: 'Your Crate sign-in code',
      text: `Your Crate sign-in code is ${token}. It expires in 15 minutes.`,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
