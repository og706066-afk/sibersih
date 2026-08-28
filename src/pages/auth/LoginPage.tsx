import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, UserCheck, GraduationCap, Lock, Mail, ArrowRight } from 'lucide-react';
import { Button, Input, Badge } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchDemoRole } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleQuickLogin = (role: UserRole) => {
    switchDemoRole(role);
    if (role === 'cleaner') navigate('/cleaner');
    else if (role === 'teacher') navigate('/teacher');
    else navigate('/admin');
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    try {
      await login(email, password);
      // redirect based on role or to cleaner default
      navigate('/cleaner');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SIBERSIH</h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Sistem Informasi Pengelolaan & Pemeriksaan Kebersihan Lingkungan Pesantren
          </p>
        </div>

        {/* Quick Role Selection for Ujikom Demo */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pilih Akses Cepat (Ujikom)
            </span>
            <Badge variant="info" size="sm">3 Peran</Badge>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('cleaner')}
              className="w-full p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 transition-all flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                    Bagian Kebersihan (Petugas)
                  </h3>
                  <p className="text-[11px] text-slate-500">Checklist inspeksi, pelanggaran & denda</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('teacher')}
              className="w-full p-3 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 transition-all flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-800">
                    Ustadz / Ustadzah (Wali Kelas)
                  </h3>
                  <p className="text-[11px] text-slate-500">Pemantauan nilai & pelanggaran (Read-Only)</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="w-full p-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 transition-all flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-800">
                    Developer & Admin
                  </h3>
                  <p className="text-[11px] text-slate-500">Master data, hak akses & konfigurasi</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-700 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
            atau masuk manual
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleStandardLogin} className="space-y-3">
          {errorMessage && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200">
              {errorMessage}
            </div>
          )}

          <Input
            type="email"
            label="Email"
            placeholder="nama@sibersih.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            required
          />

          <Input
            type="password"
            label="Kata Sandi"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
          >
            Masuk ke Aplikasi
          </Button>
        </form>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400">
          Ujikom Project • Pesantren Cleanliness Management System
        </p>
      </div>
    </div>
  );
};
