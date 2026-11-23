import React, { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, LogIn, ShieldCheck, User, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.ts';

interface LoginDialogProps {
  /** When true, renders as a dismissible switch-user modal over the active SCADA UI */
  asModal?: boolean;
}

type DialogTab = 'login' | 'change_password';

export const LoginDialog: React.FC<LoginDialogProps> = ({ asModal = false }) => {
  const login = useAuthStore((s) => s.login);
  const changePassword = useAuthStore((s) => s.changePassword);
  const closeLoginModal = useAuthStore((s) => s.closeLoginModal);
  const currentUser = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<DialogTab>('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Change Password form state
  const [cpUser, setCpUser] = useState(() => currentUser?.username ?? '');
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [showCpPwd, setShowCpPwd] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(username, password, remember);
    if (!res.ok) {
      setError(res.error ?? 'Login failed.');
    } else {
      setError(null);
      setUsername('');
      setPassword('');
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = changePassword(cpUser, cpCurrent, cpNew, cpConfirm);
    if (!res.ok) {
      setCpError(res.error ?? 'Password change failed.');
      setCpSuccess(null);
    } else {
      setCpError(null);
      setCpSuccess(`Password updated successfully for "${cpUser.trim()}". You may now sign in with your new password.`);
      setCpCurrent('');
      setCpNew('');
      setCpConfirm('');
    }
  };

  const switchTab = (next: DialogTab) => {
    setTab(next);
    setError(null);
    setCpError(null);
    setCpSuccess(null);
    if (next === 'change_password' && !cpUser && (username || currentUser?.username)) {
      setCpUser(username || currentUser?.username || '');
    }
  };

  return (
    <div
      className={
        asModal
          ? 'fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4'
          : 'min-h-screen w-screen bg-[#0a1322] flex items-center justify-center p-4 relative overflow-hidden'
      }
    >
      {!asModal && (
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <img src="/scada/OverView.jpg" alt="" className="w-full h-full object-cover blur-xs" />
        </div>
      )}

      {/* WinCC Light Industrial User Administration Window */}
      <div className="relative z-10 w-full max-w-md bg-[#dfe4ec] border-2 border-[#334155] rounded-lg shadow-2xl overflow-hidden font-mono text-slate-900">
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#0f172a] text-white px-4 py-2.5 flex items-center justify-between border-b-2 border-[#334155]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-300" />
            <span className="text-xs font-black tracking-wide uppercase">
              {asModal ? 'WinCC User Administration' : 'COHR2401 SCADA — System Login'}
            </span>
          </div>
          {asModal && (
            <button
              type="button"
              onClick={closeLoginModal}
              className="p-0.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Brand Banner */}
        <div className="bg-white border-b border-slate-300 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/scada/coherent.png" alt="Coherent" className="h-6 object-contain" />
            <span className="h-5 w-px bg-slate-300" />
            <img src="/scada/fecac.png" alt="Fuji CAC" className="h-5 object-contain" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase">Building 5 BMS / SCADA</span>
        </div>

        {/* Mode Tabs: Login | Change Password */}
        <div className="grid grid-cols-2 bg-slate-300 border-b border-slate-400 text-xs font-black">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`py-2 flex items-center justify-center gap-1.5 cursor-pointer transition ${
              tab === 'login'
                ? 'bg-[#dfe4ec] text-blue-900 border-b-2 border-blue-700'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> LOGIN
          </button>
          <button
            type="button"
            onClick={() => switchTab('change_password')}
            className={`py-2 flex items-center justify-center gap-1.5 cursor-pointer transition border-l border-slate-400 ${
              tab === 'change_password'
                ? 'bg-[#dfe4ec] text-blue-900 border-b-2 border-blue-700'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> CHANGE PASSWORD
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="p-5 space-y-4">
            {asModal && currentUser && (
              <div className="bg-blue-50 border border-blue-300 rounded px-3 py-2 text-[11px] text-blue-900">
                Signed in as: <strong>{currentUser.displayName}</strong> ({currentUser.role})
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="scada-login-user" className="block text-xs font-bold text-slate-800 uppercase">
                User Name (Administrator / User)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="scada-login-user"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter username..."
                  className="w-full pl-9 pr-3 py-2 rounded bg-white border border-slate-500 text-sm text-slate-950 font-semibold focus:outline-2 focus:outline-blue-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="scada-login-pass" className="block text-xs font-bold text-slate-800 uppercase">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="scada-login-pass"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter password..."
                  className="w-full pl-9 pr-10 py-2 rounded bg-white border border-slate-500 text-sm text-slate-950 font-semibold focus:outline-2 focus:outline-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-blue-700 cursor-pointer"
                />
                Remember Login
              </label>
            </div>

            {error && (
              <div className="bg-red-600 text-white text-xs font-bold px-3 py-2 rounded border border-red-900">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              {asModal && (
                <button
                  type="button"
                  onClick={closeLoginModal}
                  className="px-4 py-2 rounded bg-slate-300 hover:bg-slate-400 border border-slate-500 text-slate-900 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2 px-4 rounded bg-gradient-to-b from-emerald-500 to-emerald-700 hover:brightness-110 border border-emerald-900 text-white text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <LogIn className="w-4 h-4" /> LOGIN
              </button>
            </div>

            <div className="text-[10px] text-slate-600 border-t border-slate-300 pt-2 flex items-center justify-between">
              <span>Coherent Silicon Carbide Facility</span>
              <span>WinCC V8.0 Digital Twin</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePasswordSubmit} className="p-5 space-y-3">
            <div className="space-y-1">
              <label htmlFor="cp-user" className="block text-xs font-bold text-slate-800 uppercase">
                User Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="cp-user"
                  type="text"
                  autoFocus
                  value={cpUser}
                  onChange={(e) => {
                    setCpUser(e.target.value);
                    setCpError(null);
                    setCpSuccess(null);
                  }}
                  placeholder="Enter username (e.g. Fujicac)..."
                  className="w-full pl-9 pr-3 py-1.5 rounded bg-white border border-slate-500 text-sm text-slate-950 font-semibold focus:outline-2 focus:outline-blue-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="cp-current" className="block text-xs font-bold text-slate-800 uppercase">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="cp-current"
                  type={showCpPwd ? 'text' : 'password'}
                  value={cpCurrent}
                  onChange={(e) => {
                    setCpCurrent(e.target.value);
                    setCpError(null);
                    setCpSuccess(null);
                  }}
                  placeholder="Enter current password..."
                  className="w-full pl-9 pr-10 py-1.5 rounded bg-white border border-slate-500 text-sm text-slate-950 font-semibold focus:outline-2 focus:outline-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCpPwd((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {showCpPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="cp-new" className="block text-xs font-bold text-slate-800 uppercase">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="cp-new"
                  type={showCpPwd ? 'text' : 'password'}
                  value={cpNew}
                  onChange={(e) => {
                    setCpNew(e.target.value);
                    setCpError(null);
                    setCpSuccess(null);
                  }}
                  placeholder="Enter new password (min 4 characters)..."
                  className="w-full pl-9 pr-3 py-1.5 rounded bg-white border border-slate-500 text-sm text-slate-950 font-semibold focus:outline-2 focus:outline-blue-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="cp-confirm" className="block text-xs font-bold text-slate-800 uppercase">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="cp-confirm"
                  type={showCpPwd ? 'text' : 'password'}
                  value={cpConfirm}
                  onChange={(e) => {
                    setCpConfirm(e.target.value);
                    setCpError(null);
                    setCpSuccess(null);
                  }}
                  placeholder="Re-enter new password..."
                  className="w-full pl-9 pr-3 py-1.5 rounded bg-white border border-slate-500 text-sm text-slate-950 font-semibold focus:outline-2 focus:outline-blue-600"
                />
              </div>
            </div>

            {cpError && (
              <div className="bg-red-600 text-white text-xs font-bold px-3 py-2 rounded border border-red-900">
                {cpError}
              </div>
            )}

            {cpSuccess && (
              <div className="bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded border border-emerald-950 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cpSuccess}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="px-3 py-2 rounded bg-slate-300 hover:bg-slate-400 border border-slate-500 text-slate-900 text-xs font-bold cursor-pointer"
              >
                ← Back to Login
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 rounded bg-gradient-to-b from-blue-600 to-blue-800 hover:brightness-110 border border-blue-950 text-white text-xs font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <KeyRound className="w-3.5 h-3.5" /> Update Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
