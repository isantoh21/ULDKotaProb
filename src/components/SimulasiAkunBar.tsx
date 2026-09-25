import React, { useState } from 'react';
import { navigateTo } from '../services/router';
import { Peserta, Terapis } from '../types';
import { db } from '../services/supabase';

interface Props {
  currentUser: {
    role: 'guest' | 'peserta' | 'terapis' | 'admin';
    peserta?: Peserta;
    terapis?: Terapis;
  };
  onSwitchUser: (role: 'guest' | 'peserta' | 'terapis' | 'admin', data?: Peserta | Terapis) => void;
}

export const SimulasiAkunBar: React.FC<Props> = ({ currentUser, onSwitchUser }) => {
  const [isOpen, setIsOpen] = useState(false);

  const samplePeserta = db.getPesertaList()[0];
  const sampleTerapisPerilaku = db.getTerapisList().find(t => t.spesialisasi === 'terapis_perilaku');
  const sampleFisioterapis = db.getTerapisList().find(t => t.spesialisasi === 'fisioterapis');
  const sampleTenagaPLB = db.getTerapisList().find(t => t.spesialisasi === 'tenaga_plb');
  const samplePsikolog = db.getTerapisList().find(t => t.spesialisasi === 'psikolog');
  const adminList = db.getAdminList();
  const adminSugeng = adminList.find(a => a.nama.toLowerCase().includes('sugeng')) || adminList[0];
  const adminHelmi = adminList.find(a => a.nama.toLowerCase().includes('helmi')) || adminList[1];

  return (
    <div className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs py-1.5 px-4 transition-all no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
          <span className="font-semibold text-white tracking-wide">Pilih Cepat Akun Demo:</span>
          <span className="text-slate-300 truncate">
            {currentUser.role === 'admin' && 'Admin ULD (Sugeng / Helmi)'}
            {currentUser.role === 'peserta' && `Peserta: ${currentUser.peserta?.namaLengkap} (PIN: ${currentUser.peserta?.pin})`}
            {currentUser.role === 'terapis' && `Tenaga Ahli: ${currentUser.terapis?.nama} (PIN: ${currentUser.terapis?.pin})`}
            {currentUser.role === 'guest' && 'Tamu / Publik (Lihat Jadwal & Peserta)'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-200 font-bold transition-colors"
          >
            {isOpen ? '✕ Tutup Akun' : '⚡ Beralih Akun'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pb-1">
          <button
            onClick={() => {
              onSwitchUser('guest');
              navigateTo('/daftar-jadwal');
              setIsOpen(false);
            }}
            className={`p-2 rounded-xl text-left transition-colors ${currentUser.role === 'guest' ? 'bg-sky-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            <div className="font-bold">Umum / Tamu</div>
            <div className="text-[10px] text-slate-400">Jadwal & Peserta</div>
          </button>

          <button
            onClick={() => {
              if (samplePeserta) {
                onSwitchUser('peserta', samplePeserta);
                navigateTo('/portal-peserta');
                setIsOpen(false);
              }
            }}
            className={`p-2 rounded-xl text-left transition-colors ${currentUser.role === 'peserta' ? 'bg-sky-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            <div className="font-bold truncate">Siswa Terapi</div>
            <div className="text-[10px] text-slate-400 truncate">{samplePeserta?.namaLengkap?.split(' ')[0]} (PIN: {samplePeserta?.pin})</div>
          </button>

          <button
            onClick={() => {
              if (samplePsikolog) {
                onSwitchUser('terapis', samplePsikolog);
                navigateTo('/portal-terapis');
                setIsOpen(false);
              }
            }}
            className={`p-2 rounded-xl text-left transition-colors ${currentUser.terapis?.spesialisasi === 'psikolog' ? 'bg-sky-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            <div className="font-bold truncate">Psikolog</div>
            <div className="text-[10px] text-sky-200 truncate">M. Ikhsan (PIN: 112233)</div>
          </button>

          <button
            onClick={() => {
              if (sampleTerapisPerilaku) {
                onSwitchUser('terapis', sampleTerapisPerilaku);
                navigateTo('/portal-terapis');
                setIsOpen(false);
              }
            }}
            className={`p-2 rounded-xl text-left transition-colors ${currentUser.terapis?.spesialisasi === 'terapis_perilaku' ? 'bg-sky-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            <div className="font-bold truncate">Terapis Perilaku</div>
            <div className="text-[10px] text-sky-200 truncate">Ahmad Hafizul (223344)</div>
          </button>

          <button
            onClick={() => {
              if (sampleTenagaPLB) {
                onSwitchUser('terapis', sampleTenagaPLB);
                navigateTo('/portal-terapis');
                setIsOpen(false);
              }
            }}
            className={`p-2 rounded-xl text-left transition-colors ${currentUser.terapis?.spesialisasi === 'tenaga_plb' ? 'bg-sky-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            <div className="font-bold truncate">Tenaga PLB</div>
            <div className="text-[10px] text-sky-200 truncate">Salma Salwa (334455)</div>
          </button>

          <button
            onClick={() => {
              if (sampleFisioterapis) {
                onSwitchUser('terapis', sampleFisioterapis);
                navigateTo('/portal-terapis');
                setIsOpen(false);
              }
            }}
            className={`p-2 rounded-xl text-left transition-colors ${currentUser.terapis?.spesialisasi === 'fisioterapis' ? 'bg-sky-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            <div className="font-bold truncate">Fisioterapis</div>
            <div className="text-[10px] text-sky-200 truncate">Indaryati (PIN: 445566)</div>
          </button>

          <button
            onClick={() => {
              onSwitchUser('admin');
              navigateTo('/admin');
              setIsOpen(false);
            }}
            className={`p-2 rounded-xl text-left transition-colors ${currentUser.role === 'admin' ? 'bg-sky-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            <div className="font-bold truncate">Admin 1</div>
            <div className="text-[10px] text-amber-300 truncate">Sugeng (PIN: 990011)</div>
          </button>

          <button
            onClick={() => {
              onSwitchUser('admin');
              navigateTo('/admin');
              setIsOpen(false);
            }}
            className={`p-2 rounded-xl text-left transition-colors ${currentUser.role === 'admin' ? 'bg-sky-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            <div className="font-bold truncate">Admin 2</div>
            <div className="text-[10px] text-amber-300 truncate">Helmi (PIN: 990022)</div>
          </button>
        </div>
      )}
    </div>
  );
};
