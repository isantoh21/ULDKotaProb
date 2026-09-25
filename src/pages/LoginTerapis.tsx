import React, { useState } from 'react';
import { db } from '../services/supabase';
import { navigateTo } from '../services/router';
import { Terapis, AdminUser } from '../types';

interface Props {
  onLoginSuccess: (terapis: Terapis) => void;
  onAdminLoginSuccess?: (admin: AdminUser) => void;
  defaultTab?: 'all' | 'admin' | 'terapis';
}

export const LoginTerapis: React.FC<Props> = ({ 
  onLoginSuccess, 
  onAdminLoginSuccess,
  defaultTab = 'all' 
}) => {
  const terapisList = db.getTerapisList();
  const adminList = db.getAdminList();

  const [activeCategory, setActiveCategory] = useState<'all' | 'admin' | 'terapis'>(defaultTab);
  const [selectedType, setSelectedType] = useState<'terapis' | 'admin'>(() => {
    return defaultTab === 'admin' ? 'admin' : 'terapis';
  });
  const [selectedId, setSelectedId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedTerapis = terapisList.find(t => t.id === selectedId);
  const selectedAdmin = adminList.find(a => a.id === selectedId);

  const handleSelectTerapis = (t: Terapis) => {
    setSelectedType('terapis');
    setSelectedId(t.id);
    setPin(''); // Kosongkan agar user memasukkan PIN secara sadar
    setErrorMsg('');
  };

  const handleSelectAdmin = (a: AdminUser) => {
    setSelectedType('admin');
    setSelectedId(a.id);
    setPin(''); // Kosongkan agar user memasukkan PIN secara sadar
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedId || !pin.trim()) {
      setErrorMsg('Pilih nama petugas/tenaga ahli dan masukkan PIN.');
      return;
    }

    setIsLoading(true);

    if (selectedType === 'admin') {
      const res = db.loginAdmin(selectedId, pin);
      if (res.success && res.admin) {
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess(res.admin);
        }
        navigateTo('/admin');
      } else {
        setErrorMsg(res.error || 'PIN Admin tidak sesuai.');
        setIsLoading(false);
      }
    } else {
      const res = db.loginTerapis(selectedId, pin);
      if (res.success && res.terapis) {
        onLoginSuccess(res.terapis);
        navigateTo('/portal-terapis');
      } else {
        setErrorMsg(res.error || 'PIN Tenaga Ahli tidak sesuai.');
        setIsLoading(false);
      }
    }
  };

  const activePinHint = selectedType === 'admin' ? selectedAdmin?.pin : selectedTerapis?.pin;

  return (
    <div className="max-w-md mx-auto my-4 space-y-5 pb-20">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-sky-700 text-white font-bold flex items-center justify-center text-lg mx-auto shadow-sm">
          ULD
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Login Petugas & Tenaga Ahli
        </h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Pilih nama Anda (Petugas Loket Administrasi atau Tenaga Ahli Terapis/Psikolog), lalu masukkan PIN.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Filter Kategori */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-800">
              1. Pilih Kategori & Nama Anda
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              Total 6 Petugas
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-3">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                activeCategory === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua (6)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('admin')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                activeCategory === 'admin'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏢</span>
              <span>Admin (2)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('terapis')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                activeCategory === 'terapis'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🩺</span>
              <span>Terapis (4)</span>
            </button>
          </div>

          {/* List Pilihan Nama Petugas */}
          <div className="space-y-3">
            {/* Bagian 1: Petugas Loket Administrasi (Admin) */}
            {(activeCategory === 'all' || activeCategory === 'admin') && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <span>🏢 Petugas Loket Administrasi (Admin)</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {adminList.map(a => {
                    const isSelected = selectedType === 'admin' && selectedId === a.id;
                    return (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => handleSelectAdmin(a)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-sky-600 bg-sky-50/90 shadow-xs ring-1 ring-sky-300'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                          isSelected ? 'bg-sky-200 text-sky-900' : 'bg-slate-100 text-slate-700'
                        }`}>
                          👨‍💼
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                            <span>{a.nama}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                              Loket
                            </span>
                          </div>
                          <div className="text-xs text-sky-700 font-semibold truncate">
                            {a.roleTitle}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-6 h-6 rounded-full bg-sky-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bagian 2: Tenaga Ahli & Terapis */}
            {(activeCategory === 'all' || activeCategory === 'terapis') && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <span>🩺 Tenaga Ahli / Terapis / Psikolog</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {terapisList.map(t => {
                    const isSelected = selectedType === 'terapis' && selectedId === t.id;
                    let icon = '🩺';
                    if (t.spesialisasi === 'psikolog') icon = '🧠';
                    if (t.spesialisasi === 'terapis_perilaku') icon = '🧩';
                    if (t.spesialisasi === 'tenaga_plb') icon = '📚';
                    if (t.spesialisasi === 'fisioterapis') icon = '🏃';

                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleSelectTerapis(t)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-sky-600 bg-sky-50/90 shadow-xs ring-1 ring-sky-300'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                          isSelected ? 'bg-sky-200 text-sky-900' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 truncate">
                            {t.nama}
                          </div>
                          <div className="text-xs text-sky-700 font-semibold truncate">
                            {t.spesialisasiLabel}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-6 h-6 rounded-full bg-sky-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PIN Input & Submit Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                2. Masukkan PIN Anda
              </label>
              <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                Default: {activePinHint}
              </span>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••••"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600 text-lg font-mono font-bold tracking-widest text-center shadow-2xs"
            />
            <span className="text-[11px] text-slate-400 mt-1 block text-center">
              (PIN akun dapat diubah sewaktu-waktu di dalam panel)
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 rounded-xl text-white font-extrabold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 ${
              selectedType === 'admin'
                ? 'bg-emerald-700 hover:bg-emerald-600'
                : 'bg-sky-700 hover:bg-sky-600'
            }`}
          >
            {isLoading ? (
              <span>Memverifikasi Kredensial...</span>
            ) : selectedType === 'admin' ? (
              <span>Masuk ke Panel Loket Administrasi →</span>
            ) : (
              <span>Masuk ke Portal Jadwal Terapis →</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
