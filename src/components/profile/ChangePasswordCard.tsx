import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Card, Button } from '../common';
import { useAuth } from '../../contexts/AuthContext';

export const ChangePasswordCard: React.FC = () => {
  const { changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Validasi
    if (!newPassword.trim()) {
      setFeedback({ type: 'error', text: 'Kata sandi baru tidak boleh kosong.' });
      return;
    }

    if (newPassword.length < 6) {
      setFeedback({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.' });
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(newPassword);
      setFeedback({
        type: 'success',
        text: 'Kata sandi berhasil diperbarui! Gunakan kata sandi baru ini untuk login berikutnya.',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Failed to change password:', err);
      let errorMsg = 'Gagal memperbarui kata sandi. Silakan coba lagi.';
      if (err?.code === 'auth/requires-recent-login') {
        errorMsg = 'Sesi login Anda telah berlangsung lama. Silakan logout dan login ulang sebelum mengubah kata sandi demi keamanan.';
      } else if (err?.code === 'auth/weak-password') {
        errorMsg = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka minimal 6 karakter.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setFeedback({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-white space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Lock className="w-4 h-4 text-emerald-600" />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Ubah Kata Sandi Akun
          </h3>
          <p className="text-[11px] text-slate-500">
            Perbarui kata sandi login Anda secara mandiri & aman
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-start gap-2 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input Kata Sandi Baru */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kata Sandi Baru
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Minimal 6 karakter..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-xs px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
              title={showNewPassword ? 'Sembunyikan' : 'Tampilkan'}
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Input Konfirmasi Kata Sandi Baru */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Konfirmasi Kata Sandi Baru
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Ketik ulang kata sandi baru..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-xs px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
              title={showConfirmPassword ? 'Sembunyikan' : 'Tampilkan'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="w-full font-semibold"
            isLoading={isLoading}
            disabled={isLoading}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Simpan Kata Sandi Baru
          </Button>
        </div>
      </form>
    </Card>
  );
};
