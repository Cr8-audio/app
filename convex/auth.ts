import { convexAuth } from '@convex-dev/auth/server';
import { ResendOTP } from './resendOTP';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP],
});
