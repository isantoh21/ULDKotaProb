import React, { useState, useMemo } from 'react';
import { db } from '../services/supabase';
import { navigateTo } from '../services/router';
import { Peserta } from '../types';

interface Props {
  onLoginSuccess: (peserta: Peserta) => void;
}

const ADMIN_CONTACTS = [
  {
    id: 'admin-1',
    nama: 'Sugeng',
    role: 'Admin 1 ULD Kota Probolinggo',
    waNumber: '6285236028521',
    waFormatted: '0852-3602-8521',
    waUrl: 'https://wa.me/6285236028521?text=Halo%20Pak%20Sugeng%20(Admin%201%20ULD%20Kota%20Probolinggo),%20saya%20ingin%20mendaftarkan%20anak%20saya%20untuk%20layanan%20asesmen%20awal%20di%20ULD...'
  },
  {
    id: 'admin-2',
    nama: 'Helmi',
    role: 'Admin 2 ULD Kota Probolinggo',
    waNumber: '6282247952696',
    waFormatted: '0822-4795-2696',
    waUrl: 'https://wa.me/6282247952696?text=Halo%20Pak%20Helmi%20(Admin%202%20ULD%20Kota%20Probolinggo),%20saya%20ingin%20mendaftarkan%20anak%20saya%20untuk%20layanan%20asesmen%20awal%20di%20ULD...'
  }
];

export const LoginPeserta: React.FC<Props> = ({ onLoginSuccess }) => {
  const [selectedPesertaId, setSelectedPesertaId] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPinHint, setShowPinHint] = useState(false);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);

  const rawList = db.getPesertaList();

  // Sort alphabetically by child's name
  const sortedPeserta = useMemo(() => {
    return [...rawList].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
  }, [rawList]);

  // Filter based on search query
  const filteredPeserta = useMemo(() => {
    if (!searchFilter.trim()) return sortedPeserta;
    const q = searchFilter.toLowerCase();
    return sortedPeserta.filter(p => 
      p.namaLengkap.toLowerCase().includes(q) ||
      (p.asalSekolah && p.asalSekolah.toLowerCase().includes(q)) ||
      p.namaWali.toLowerCase().includes(q) ||
      p.nomorRekamMedis.toLowerCase().includes(q)
    );
  }, [sortedPeserta, searchFilter]);

  const currentSelected = useMemo(() => {
    return sortedPeserta.find(p => p.id === selectedPesertaId);
  }, [sortedPeserta, selectedPesertaId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPesertaId) {
      setErrorMsg('Silakan pilih nama siswa dari daftar drop down terlebih dahulu.');
      return;
    }
    if (!pin.trim()) {
      setErrorMsg('Masukkan 6 digit PIN pribadi siswa.');
      return;
    }

    setIsLoading(true);
    const result = db.loginPeserta(selectedPesertaId, pin);

    if (result.success && result.peserta) {
      onLoginSuccess(result.peserta);
      navigateTo('/portal-peserta');
    } else {
      setErrorMsg(result.error || 'PIN yang Anda masukkan tidak sesuai.');
      setIsLoading(false);
    }
  };

  const handleSelectPeserta = (id: string) => {
    setSelectedPesertaId(id);
    setErrorMsg('');
    const p = sortedPeserta.find(item => item.id === id);
    if (p) {
      // Default initial PIN for easy access
      setPin(p.pin);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-4 space-y-6 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-sky-700 text-white font-bold flex items-center justify-center text-lg mx-auto shadow-md">
          ULD
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Login Siswa Terapi Rutin
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Pilih nama siswa dari menu dropdown di bawah ini, lalu masukkan PIN pribadi untuk mengamankan akun dan memperbarui PIN pribadi Ananda.
        </p>

        {/* Verified Data Banner */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-100/80 rounded-full text-[11px] text-sky-700 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
          <span>{sortedPeserta.length} Siswa Terapi Rutin Kota Probolinggo Terdaftar (Tanpa Duplikasi)</span>
        </div>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Search Helper for 48 Students */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Cari atau Filter Nama Siswa:</span>
              <span className="text-[11px] text-slate-400 font-normal">Ketik nama anak / sekolah</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Contoh: Abimanyu, Azlan, Gufron, Mangunharjo..."
                className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600 text-xs"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Main Dropdown Select */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Pilih Nama Siswa dari Drop Down *
            </label>
            <select
              required
              value={selectedPesertaId}
              onChange={e => handleSelectPeserta(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600 text-sm font-semibold text-slate-900 bg-white shadow-sm"
            >
              <option value="" disabled>
                -- Pilih Nama Siswa Terapi ({filteredPeserta.length} siswa) --
              </option>
              {filteredPeserta.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.namaLengkap} {p.asalSekolah ? `· ${p.asalSekolah}` : ''} (Wali: {p.namaWali})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Student Confirmation Card */}
          {currentSelected && (
            <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-100/80 text-xs space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-sky-100/60 pb-2">
                <div>
                  <span className="text-[10px] text-sky-600 font-bold uppercase tracking-wider block">Siswa Terpilih</span>
                  <div className="text-base font-bold text-sky-900">
                    {currentSelected.namaLengkap}
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-sky-100">
                  {currentSelected.nomorRekamMedis}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 pt-1">
                <div>
                  <span className="text-slate-500 font-medium">Asal Sekolah:</span>{' '}
                  <strong className="text-slate-900">{currentSelected.asalSekolah || 'Sekolah Inklusi'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Orang Tua / Wali:</span>{' '}
                  <strong className="text-slate-900">{currentSelected.namaWali}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Kecamatan:</span>{' '}
                  <strong className="text-slate-900">{currentSelected.kecamatan}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Layanan Rutin:</span>{' '}
                  <strong className="text-sky-800">{currentSelected.ragamDisabilitas}</strong>
                </div>
              </div>
            </div>
          )}

          {/* PIN Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Masukkan PIN Pribadi (6 Digit Angka) *
              </label>
              {currentSelected && (
                <button
                  type="button"
                  onClick={() => setShowPinHint(!showPinHint)}
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-medium underline"
                >
                  {showPinHint ? 'Sembunyikan Bantuan PIN' : 'Bantuan PIN Pribadi'}
                </button>
              )}
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••••"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600 text-base font-mono tracking-widest text-center"
            />

            {showPinHint && currentSelected && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                <span>PIN Terdaftar Siswa Ini: <strong className="font-mono font-bold text-amber-950 text-xs">{currentSelected.pin}</strong></span>
                <button
                  type="button"
                  onClick={() => setPin(currentSelected.pin)}
                  className="px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded font-semibold text-amber-900"
                >
                  Gunakan PIN Ini
                </button>
              </div>
            )}

            <span className="text-[11px] text-slate-500 mt-1 block text-right">
              PIN default awal: <code className="font-mono font-bold text-sky-700">123456</code> (dapat diubah di Admin)
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !selectedPesertaId}
            className="w-full py-3.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 min-h-[48px]"
          >
            {isLoading ? 'Memeriksa Kredensial...' : 'Masuk & Pilih Jadwal Terapi'}
          </button>
        </form>

        {/* Notice for New Visitors */}
        <div className="pt-4 border-t border-slate-100 space-y-3 text-center">
          <div className="text-xs text-slate-500">
            Nama anak Anda belum ada di daftar drop down terapi rutin?
          </div>
          <button
            type="button"
            onClick={() => setShowContactAdminModal(true)}
            className="w-full py-2.5 px-4 rounded-xl border border-sky-600 text-sky-700 hover:bg-sky-50 text-xs font-bold transition-colors cursor-pointer"
          >
            Daftar Layanan Asesmen Awal (Guest / Pasien Baru)
          </button>
        </div>
      </div>

      {/* Modal Kontak Admin 1 & Admin 2 untuk Pendaftaran Asesmen Awal */}
      {showContactAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 shadow-2xl border-2 border-emerald-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💬</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Pendaftaran Layanan Asesmen Awal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hubungi Petugas Admin Loket ULD Kota Probolinggo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContactAdminModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bagi calon siswa baru yang ingin mendaftar layanan asesmen awal atau konsultasi psikolog, silakan hubungi langsung salah satu petugas Admin kami melalui WhatsApp di bawah ini:
            </p>

            {/* Tombol WhatsApp Langsung ke Admin 1 & Admin 2 */}
            <div className="space-y-3">
              {ADMIN_CONTACTS.map(adm => (
                <div 
                  key={adm.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-emerald-50/40 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{adm.nama}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                        {adm.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      WA: <strong className="text-slate-700">{adm.waFormatted}</strong>
                    </div>
                  </div>

                  <a
                    href={adm.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
                  >
                    <span>💬 Chat WA Pak {adm.nama}</span>
                    <span>→</span>
                  </a>
                </div>
              ))}
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1 leading-relaxed">
              <div className="font-bold text-amber-950">📋 Berkas yang Perlu Disiapkan untuk Loket ULD:</div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-900">
                <li>Surat Rekomendasi untuk asesmen dari sekolah</li>
                <li>Fotocopy KTP orang tua</li>
                <li>Fotocopy Kartu Keluarga (KK)</li>
                <li>Fotocopy Akta Lahir Anak</li>
              </ul>
              <div className="text-[10px] text-amber-800 pt-1 border-t border-amber-200/60">
                Setelah asesmen dan dinyatakan butuh terapi, anak akan dibuatkan akun siswa reguler yang mendapatkan akses untuk mendaftar layanan 1x seminggu.
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowContactAdminModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
