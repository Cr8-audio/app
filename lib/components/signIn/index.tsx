'use client';

import { useState } from 'react';
import { Button } from '@/lib/components/ui/button';
import { LoaderCircle } from 'lucide-react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useRef } from 'react';

interface SignInButtonProps {}

const SignInButton = ({}: SignInButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuthActions();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signIn('resend-otp', { email });
      setVerificationSent(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to send verification code:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to send verification code. Please try again.',
      );
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signIn('resend-otp', { email, code });
      // After successful sign-in, ConvexAuthProvider will update auth state
      // HomeClient's AuthenticatedRedirect will handle routing to /onboarding or /username
      setIsLoading(false);
    } catch (error) {
      console.error('Verification failed:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Invalid verification code. Please try again.',
      );
      setIsLoading(false);
      setCode('');
    }
  };

  if (verificationSent) {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-2">
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 8-digit code"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={isLoading}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          type="submit"
          className="w-full sm:w-auto flex items-center gap-2"
        >
          {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email Address
        </label>
        <input
          ref={emailInputRef}
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={isLoading}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        type="submit"
        className="w-full sm:w-auto flex items-center gap-2"
      >
        {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {isLoading ? 'Sending code...' : 'Sign In with Email'}
      </Button>
    </form>
  );
};

export default SignInButton;
