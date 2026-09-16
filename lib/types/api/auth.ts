export interface UserIdentity {
  username: string;
  avatarUrl: string;
}

export interface AuthState {
  userIdentity: UserIdentity | null;
  setUserIdentity: (identity: UserIdentity) => void;
}
