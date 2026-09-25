import React, { useState } from 'react';
import { db } from '../services/supabase';
import { navigateTo } from '../services/router';
import { PendaftaranAsesmenGuest } from '../types';

interface Props {
  guestId?: string;
  onAdminVerifySuccess?: () => void;
}

export const TiketAsesmen: React.FC<Props> = ({ guestId }) => {
  const [copied, setCopied] = useState(false);
  const asesmenList = db.getAsesmenGuestList();
  
  // Find current or fallback to latest
  const guest: PendaftaranAsesmenGuest | undefined = guestId 
    ? db.getAsesmenById(guestId) 
    : asesmenList[0];

  if (!guest) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Data Pendaftaran Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          Belum ada riwayat pendaftaran asesmen yang dipilih atau URL tidak valid.
        </p>
        <button
          onClick={() => navigateTo('/asesmen-guest')}
          className="px-4 py-2 bg-sky-700 text-white rounded-xl text-xs font-semibold"
        >
          Daftar Asesmen Baru
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReg = () => {
    navigator.clipboard.writeText(guest.nomorRegistrasi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsAppText = encodeURIComponent(
    `*BUKTI PENDAFTARAN ASESMEN ULD KOTA PROBOLINGGO*\n\n` +
    `No. Registrasi: ${guest.nomorRegistrasi}\n` +
    `Nama Anak: ${guest.namaAnak}\n` +
    `Nama Wali: ${guest.namaOrangTua}\n` +
    `Rencana Datang: ${guest.tanggalRencanaDatang} (${guest.jamRencanaDatang})\n` +
    `Lokasi: Gedung ULD Kota Probolinggo (Jl. Hayam Wuruk No. 63)\n\n` +
    `*Catatan:* Harap membawa berkas fisik (KK, KTP Wali, Buku KIA Pink) untuk verifikasi dokumen awal.`
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Action Bar (Top) */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => navigateTo('/asesmen-guest')}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          ← Kembali ke Form
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Cetak Bukti</span>
          </button>

          <a
            href={`https://wa.me/?text=${shareWhatsAppText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
            </svg>
            <span>Kirim ke WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Printable Ticket Card */}
      <div className="bg-white rounded-3xl border-2 border-dashed border-sky-600/30 overflow-hidden shadow-lg">
        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-slate-900 text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold text-sky-100 uppercase tracking-widest">
                Unit Layanan Disabilitas (ULD) Kota Probolinggo
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Bukti Pendaftaran Asesmen Awal
              </h1>
              <div className="text-xs text-slate-300 mt-1">
                Layanan Inklusif Ramah Disabilitas Pemerintah Kota Probolinggo
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <div className="text-[10px] text-sky-200 font-mono">NOMOR REGISTRASI</div>
              <div className="text-lg sm:text-xl font-extrabold font-mono tracking-wider text-sky-200">
                {guest.nomorRegistrasi}
              </div>
              <button
                onClick={handleCopyReg}
                className="no-print mt-1 text-[10px] text-sky-100 hover:text-white underline"
              >
                {copied ? 'Tersalin!' : 'Salin Nomor'}
              </button>
            </div>
          </div>
        </div>

        {/* Status Callout */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Status Pendaftaran:</span>
            <span className="font-bold">
              {guest.status === 'menunggu_verifikasi_fisik' && 'Menunggu Verifikasi Dokumen Fisik di Lokasi'}
              {guest.status === 'terbit_akun_peserta' && 'Dokumen Terverifikasi & Akun Peserta Aktif'}
              {guest.status === 'dokumen_diverifikasi' && 'Berkas Terverifikasi'}
            </span>
          </div>
          <span className="text-[11px] text-amber-700 hidden sm:inline">Wajib Datang Langsung</span>
        </div>

        {/* Ticket Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Calon Peserta / Anak</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{guest.namaAnak}</div>
              <div className="text-xs text-slate-600 mt-1">
                Lahir: {guest.tanggalLahir} ({guest.jenisKelamin === 'L' ? 'Laki-Laki' : 'Perempuan'})
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                NIK / No KK: {guest.nikAnakOrKK}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Orang Tua / Wali Pendamping</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{guest.namaOrangTua}</div>
              <div className="text-xs text-slate-600 mt-1">WhatsApp: {guest.nomorWhatsApp}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Kecamatan: {guest.kecamatan}, Kota Probolinggo
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Indikasi Kebutuhan / Keluhan Awal</div>
              <p className="text-xs text-slate-800 mt-1 leading-relaxed">
                {guest.indikasiAwal}
              </p>
            </div>
          </div>

          {/* Schedule of Physical Visit */}
          <div className="p-5 rounded-2xl bg-sky-50 border border-sky-100/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase">
              <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Jadwal Kedatangan ke Kantor ULD</span>
            </div>
            <div className="text-lg font-extrabold text-sky-900">
              {guest.tanggalRencanaDatang} · {guest.jamRencanaDatang}
            </div>
            <div className="text-xs text-sky-700 leading-relaxed">
              Lokasi: Gedung ULD Kota Probolinggo, Jl. Hayam Wuruk No. 63, Mangunharjo, Kec. Mayangan, Kota Probolinggo.
            </div>
          </div>

          {/* Checklist Documents */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Berkas Asli & Fotokopi yang Wajib Dibawa:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              {guest.dokumenAkanDibawa.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-sky-600 font-bold">✓</span>
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* If already verified & PIN issued */}
          {guest.status === 'terbit_akun_peserta' && guest.pinDihasilkan && (
            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 space-y-2">
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Akun Peserta Resmi Anda Telah Aktif!
              </div>
              <div className="text-xs text-slate-700">
                Gunakan kredensial berikut untuk masuk ke Portal Peserta & mendaftar jadwal terapi:
              </div>
              <div className="flex flex-wrap gap-4 items-center bg-white p-3 rounded-xl border border-emerald-300">
                <div>
                  <div className="text-[10px] text-slate-500">Nama Login:</div>
                  <div className="text-sm font-bold text-slate-900">{guest.namaAnak}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">PIN Rahasia:</div>
                  <div className="text-lg font-mono font-extrabold text-emerald-700 tracking-wider">
                    {guest.pinDihasilkan}
                  </div>
                </div>
                <button
                  onClick={() => navigateTo('/login-peserta')}
                  className="ml-auto px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors"
                >
                  Masuk Sekarang →
                </button>
              </div>
            </div>
          )}

          {/* Visual Barcode Indicator for Physical Verification Desk */}
          <div className="pt-4 border-t border-slate-200 text-center space-y-2">
            <div className="inline-block p-3 bg-slate-50 rounded-xl border border-slate-200">
              {/* Clean CSS barcode mockup */}
              <div className="flex items-center justify-center gap-1 h-10 w-48 mx-auto px-2">
                {[2, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1].map((w, i) => (
                  <span
                    key={i}
                    style={{ width: `${w * 2.5}px` }}
                    className="h-full bg-slate-800 inline-block"
                  />
                ))}
              </div>
              <div className="text-[11px] font-mono tracking-widest text-slate-500 mt-1">
                {guest.nomorRegistrasi}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Tunjukkan barcode atau nomor registrasi ini kepada petugas loket verifikasi ULD.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Admin Verification helper for testing/demo */}
      {guest.status === 'menunggu_verifikasi_fisik' && (
        <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <div>
            <span className="font-semibold text-slate-800">Uji Coba Verifikasi Petugas ULD:</span> Ingin memverifikasi pendaftaran ini sekarang dan membuatkan PIN peserta?
          </div>
          <button
            onClick={() => navigateTo('/admin')}
            className="px-3.5 py-1.5 rounded-lg bg-sky-700 text-white font-semibold hover:bg-sky-600 transition-colors shrink-0"
          >
            Buka Loket Verifikasi Admin →
          </button>
        </div>
      )}
    </div>
  );
};
