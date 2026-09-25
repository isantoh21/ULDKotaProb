import React, { useState, useEffect } from 'react';
import { navigateTo } from '../services/router';
import { db } from '../services/supabase';

export const Home: React.FC = () => {
  const [stats, setStats] = useState(() => db.getStatistik());
  const [terapisList, setTerapisList] = useState(() => db.getTerapisList());
  const [adminList, setAdminList] = useState(() => db.getAdminList());

  useEffect(() => {
    const handleUpdate = () => {
      setStats(db.getStatistik());
      setTerapisList(db.getTerapisList());
      setAdminList(db.getAdminList());
    };
    window.addEventListener('uld_data_updated', handleUpdate);
    return () => window.removeEventListener('uld_data_updated', handleUpdate);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Super Simple Banner Header */}
      <section className="bg-gradient-to-br from-sky-800 via-sky-700 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg text-center sm:text-left relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-700/80 border border-sky-500/50 text-xs font-semibold text-sky-100">
            <span>🏛️ Pemerintah Kota Probolinggo</span>
            <span>·</span>
            <span>Layanan Inklusi Gratis</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Unit Layanan Disabilitas (ULD) Kota Probolinggo
          </h1>

          <p className="text-sm sm:text-base text-sky-50 max-w-2xl leading-relaxed">
            Sistem pendaftaran jadwal terapi rutin dan pemantauan tumbuh kembang terpadu untuk anak berkebutuhan khusus.
          </p>

          {/* Jam Layanan Highlight */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-sky-900/70 border border-sky-400/40 text-xs sm:text-sm font-bold text-amber-300">
            <span className="text-base">🕒</span>
            <span>Jadwal Terapi: Setiap Hari Senin – Jumat, Pukul 09.00 – 13.00 WIB</span>
          </div>
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-sky-300/10 blur-2xl pointer-events-none" />
      </section>

      {/* 4 MENU UTAMA SUPER SIMPLE */}
      <section className="space-y-4">
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pilih Layanan Anda
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Silakan pilih menu layanan yang Anda butuhkan di bawah ini:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* MENU 1: SISWA TERAPI RUTIN */}
          <div className="bg-white rounded-3xl p-6 border-2 border-sky-600/30 hover:border-sky-600 transition-all shadow-sm flex flex-col justify-between space-y-4 group">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 text-2xl flex items-center justify-center font-bold">
                🧒
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold text-[11px] inline-block">
                Sudah Terdaftar di ULD
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors">
                Siswa Terapi Rutin
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tinggal pilih nama anak dari <strong>drop down</strong> dan masukkan <strong>PIN pribadi</strong>. Maksimal 1x pendaftaran dalam seminggu untuk pemerataan kuota layanan.
              </p>
            </div>

            <button
              onClick={() => navigateTo('/login-peserta')}
              className="w-full py-3.5 px-4 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Pilih Nama & Masuk (PIN)</span>
              <span>→</span>
            </button>
          </div>

          {/* MENU 2: JADWAL & PESERTA TERDAFTAR (AKSES UMUM) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-indigo-600/30 hover:border-indigo-600 transition-all shadow-sm flex flex-col justify-between space-y-4 group">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-800 text-2xl flex items-center justify-center font-bold">
                👥
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-bold text-[11px] inline-block">
                Terbuka untuk Umum
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-800 transition-colors">
                Jadwal & Peserta Terdaftar
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cek jadwal sesi harian dan lihat <strong>nama-nama siswa</strong> yang sudah terjadwal di setiap hari Senin – Jumat pukul 09.00 – 13.00 WIB.
              </p>
            </div>

            <button
              onClick={() => navigateTo('/daftar-jadwal')}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Lihat Jadwal & Peserta Terjadwal</span>
              <span>→</span>
            </button>
          </div>

          {/* MENU 3: TENAGA AHLI & TERAPIS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-sky-500 transition-all shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 text-2xl flex items-center justify-center font-bold">
                🩺
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px] inline-block">
                Tenaga Ahli & Psikolog
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                Login Terapis & Psikolog
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Akses untuk <strong>Psikolog, Terapis Perilaku, Tenaga PLB, dan Fisioterapis</strong> guna membuka dan menutup slot sesi 09.00 – 13.00 WIB.
              </p>
            </div>

            <button
              onClick={() => navigateTo('/login-terapis')}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              Masuk Tenaga Ahli (PIN) →
            </button>
          </div>

          {/* MENU 4: ADMIN SUGENG & HELMI */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-slate-400 transition-all shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 text-2xl flex items-center justify-center font-bold">
                🏢
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px] inline-block">
                Loket Administrasi ULD
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                Petugas Admin (Sugeng & Helmi)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Penjadwalan khusus ke Psikolog, pembuatan akun siswa terapi baru (cukup nama, ortu, PIN), dan penjadwalan asesmen awal baru.
              </p>
            </div>

            <button
              onClick={() => navigateTo('/login-admin')}
              className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <span>Pilih Petugas & Masuk (PIN)</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* HUBUNGI PETUGAS ADMIN ULD VIA WHATSAPP (SUGENG & HELMI) */}
      <section className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-800 shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <span>💬 Layanan Informasi & Konsultasi Langsung</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Hubungi Petugas Admin ULD Kota Probolinggo
          </h3>
          <p className="text-xs sm:text-sm text-emerald-200 leading-relaxed max-w-2xl">
            Untuk <strong>penjadwalan asesmen baru</strong> atau <strong>pendaftaran ke Psikolog</strong>, silakan hubungi langsung petugas loket kami melalui WhatsApp:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {adminList.map(adm => {
            const waUrl = `https://wa.me/${adm.nomorTelepon}?text=Halo%20Pak%20${encodeURIComponent(adm.nama)}%20(${encodeURIComponent(adm.roleTitle)}),%20saya%20ingin%20berkonsultasi%20mengenai%20layanan%20ULD%20Kota%20Probolinggo...`;
            return (
              <div 
                key={adm.id}
                className="p-5 rounded-3xl bg-emerald-900/70 border border-emerald-700/80 flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  {adm.fotoUrl ? (
                    <img
                      src={adm.fotoUrl}
                      alt={adm.nama}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0 bg-white/10"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-800 border-2 border-emerald-500 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-md">
                      {adm.nama.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-white text-base sm:text-lg">{adm.nama}</span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-700">
                        {adm.roleTitle}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-300 font-mono mt-1">
                      WhatsApp: <strong>+{adm.nomorTelepon}</strong>
                    </div>
                  </div>
                </div>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-xs shadow transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>💬 Chat WA {adm.nama}</span>
                  <span>→</span>
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* LOKASI ULD KOTA PROBOLINGGO & LINK GOOGLE MAPS PROMINEN */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-sky-700/20 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 uppercase tracking-wider">
              <span>📍 Lokasi Kantor & Tempat Terapi Langsung</span>
            </div>
            <h3 className="text-xl font-black text-slate-900">
              Gedung Unit Layanan Disabilitas Kota Probolinggo
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Jl. Hayam Wuruk No. 63, Mangunharjo, Kec. Mayangan, Kota Probolinggo, Jawa Timur 67217
            </p>
          </div>

          <a
            href="https://maps.app.goo.gl/LJ7Ymhp9QqdEnoy57"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            <span>🗺️ Buka di Google Maps</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Google Maps Embed Langsung */}
        <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
          <iframe
            title="Lokasi Google Maps ULD Kota Probolinggo"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3953.362290619172!2d113.2240633!3d-7.7541116!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7ad0066a99927%3A0x5c969f11d0009338!2sUnit%20Layanan%20Disabilitas%20(ULD)%20Bidang%20Pendidikan%20Kota%20Probolinggo!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      {/* 4 Pilar Tenaga Ahli Preview */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Tim Tenaga Ahli & Psikolog ULD
            </h2>
            <p className="text-xs text-slate-500">
              Didukung oleh psikolog, terapis perilaku, fisioterapis, dan pendidik luar biasa berkompeten.
            </p>
          </div>
          <button
            onClick={() => navigateTo('/panduan-layanan')}
            className="text-xs font-semibold text-sky-700 hover:underline hidden sm:block"
          >
            Lihat Panduan & SOP →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {terapisList.map((t) => (
            <div key={t.id} className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {t.fotoUrl ? (
                    <img
                      src={t.fotoUrl}
                      alt={t.nama}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-500 shadow-sm shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-sky-100 border border-sky-200 text-sky-800 font-black text-xl flex items-center justify-center shrink-0">
                      {t.nama.charAt(0)}
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wide block">
                      {t.spesialisasiLabel}
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm leading-tight mt-0.5">
                      {t.nama}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {(t.id === 'terapis-4' || t.spesialisasi === 'psikolog' || (t.gelar && t.gelar.toLowerCase().includes('klinis'))) ? 'Psikolog' : t.gelar}
                </div>
                <div className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                  {t.deskripsi}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                <span>📍</span>
                <span className="truncate">{t.ruangPraktek}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
