import React, { useState } from 'react';
import { db } from '../services/supabase';
import { navigateTo } from '../services/router';
import { Terapis } from '../types';

interface Props {
  onLoginSuccess: (terapis: Terapis) => void;
}

export const LoginTerapis: React.FC<Props> = ({ onLoginSuccess }) => {
  const terapisList = db.getTerapisList();
  const [selectedTerapisId, setSelectedTerapisId] = useState<string>(terapisList[0]?.id || '');
  const [pin, setPin] = useState(terapisList[0]?.pin || '223344');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedTerapis = terapisList.find(t => t.id === selectedTerapisId);

  const handleSelect = (t: Terapis) => {
    setSelectedTerapisId(t.id);
    setPin(t.pin);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedTerapisId || !pin.trim()) {
      setErrorMsg('Pilih nama terapis/psikolog dan masukkan PIN.');
      return;
    }

    setIsLoading(true);
    const res = db.loginTerapis(selectedTerapisId, pin);

    if (res.success && res.terapis) {
      onLoginSuccess(res.terapis);
      navigateTo('/portal-terapis');
    } else {
      setErrorMsg(res.error || 'PIN tidak sesuai.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-4 space-y-5 pb-20">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-teal-800 text-white font-bold flex items-center justify-center text-lg mx-auto shadow">
          ULD
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Login Tenaga Ahli & Terapis
        </h1>
        <p className="text-xs text-slate-500">
          Pilih nama Anda, lalu masukkan PIN untuk membuka atau menutup jadwal.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* 4 Big Clear Choice Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            1. Siapakah Anda? (Klik Nama Anda)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {terapisList.map(t => {
              const isSelected = t.id === selectedTerapisId;
              let icon = '🩺';
              if (t.spesialisasi === 'psikolog') icon = '🧠';
              if (t.spesialisasi === 'terapis_perilaku') icon = '🧩';
              if (t.spesialisasi === 'tenaga_plb') icon = '📚';
              if (t.spesialisasi === 'fisioterapis') icon = '🏃';

              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${isSelected ? 'border-teal-700 bg-teal-50/80 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                >
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1 truncate">
                    <div className="font-extrabold text-sm text-slate-900 truncate">
                      {t.nama}
                    </div>
                    <div className="text-xs text-teal-800 font-semibold">
                      {t.spesialisasiLabel}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN Input */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                2. Masukkan PIN Pribadi Anda
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Default: {selectedTerapis?.pin}
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
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-lg font-mono font-bold tracking-widest text-center"
            />
            <span className="text-[11px] text-slate-500 mt-1 block text-center">
              (PIN dapat diubah sendiri kapanpun setelah berhasil masuk)
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-sm shadow-md active:scale-98 transition-all"
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk ke Halaman Jadwal'}
          </button>
        </form>
      </div>
    </div>
  );
};
