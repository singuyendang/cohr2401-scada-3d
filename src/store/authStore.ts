import { create } from 'zustand';

export type UserRole = 'Administrator' | 'User';

export interface AuthUser {
  username: string;
  displayName: string;
  role: UserRole;
  loginTime: string;
}

interface AccountDef {
  username: string;
  displayName: string;
  defaultPassword: string;
  role: UserRole;
}

const STORAGE_USER_KEY = 'cohr2401_b5_remembered_user';
const STORAGE_PWD_KEY = 'cohr2401_b5_account_passwords';

const ACCOUNTS: AccountDef[] = [
  {
    username: 'Fujicac',
    displayName: 'Fujicac',
    defaultPassword: 'COHR2401',
    role: 'Administrator',
  },
  {
    username: 'User',
    displayName: 'Operator User',
    defaultPassword: 'COHR2401',
    role: 'User',
  },
];

function loadPasswords(): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const a of ACCOUNTS) {
    defaults[a.username.toLowerCase()] = a.defaultPassword;
  }
  try {
    if (typeof window === 'undefined' || !window.localStorage) return defaults;
    const raw = window.localStorage.getItem(STORAGE_PWD_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function savePasswords(passwords: Record<string, string>): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_PWD_KEY, JSON.stringify(passwords));
    }
  } catch {
    // Ignore storage errors
  }
}

function loadRememberedUser(): AuthUser | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.username || !parsed.role) return null;
    const matched = ACCOUNTS.find(
      (a) => a.username.toLowerCase() === parsed.username?.toLowerCase()
    );
    if (!matched) return null;
    return {
      username: matched.username,
      displayName: matched.displayName,
      role: matched.role,
      loginTime: parsed.loginTime ?? new Date().toLocaleTimeString('en-GB', { hour12: false }),
    };
  } catch {
    return null;
  }
}

interface AuthStore {
  user: AuthUser | null;
  remembered: boolean;
  loginModalOpen: boolean;
  passwords: Record<string, string>;
  login: (username: string, password: string, remember: boolean) => { ok: boolean; error?: string };
  changePassword: (
    username: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => { ok: boolean; error?: string };
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const initialUser = loadRememberedUser();

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: initialUser,
  remembered: Boolean(initialUser),
  loginModalOpen: false,
  passwords: loadPasswords(),

  login: (username, password, remember) => {
    const cleanUser = username.trim();
    const account = ACCOUNTS.find(
      (a) => a.username.toLowerCase() === cleanUser.toLowerCase()
    );
    const storedPwd = account ? get().passwords[account.username.toLowerCase()] : undefined;
    if (!account || storedPwd !== password) {
      return { ok: false, error: 'Invalid username or password. Please try again.' };
    }
    const authUser: AuthUser = {
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      loginTime: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (remember) {
          window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(authUser));
        } else {
          window.localStorage.removeItem(STORAGE_USER_KEY);
        }
      }
    } catch {
      // Ignore storage errors
    }
    set({ user: authUser, remembered: remember, loginModalOpen: false });
    return { ok: true };
  },

  changePassword: (username, currentPassword, newPassword, confirmPassword) => {
    const cleanUser = username.trim();
    const account = ACCOUNTS.find(
      (a) => a.username.toLowerCase() === cleanUser.toLowerCase()
    );
    if (!account) {
      return { ok: false, error: 'Account does not exist.' };
    }
    const key = account.username.toLowerCase();
    const storedPwd = get().passwords[key];
    if (storedPwd !== currentPassword) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
    if (newPassword.length < 4) {
      return { ok: false, error: 'New password must be at least 4 characters.' };
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: 'New password confirmation does not match.' };
    }
    const nextPasswords = { ...get().passwords, [key]: newPassword };
    savePasswords(nextPasswords);
    set({ passwords: nextPasswords });
    return { ok: true };
  },

  logout: () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_USER_KEY);
      }
    } catch {
      // Ignore storage errors
    }
    set({ user: null, remembered: false, loginModalOpen: false });
  },

  openLoginModal: () => set({ loginModalOpen: true }),
  closeLoginModal: () => set({ loginModalOpen: false }),
}));
