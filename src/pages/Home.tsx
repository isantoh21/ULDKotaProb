import React from 'react';
import { navigateTo } from '../services/router';
import { db } from '../services/supabase';

export const Home: React.FC = () => {
  const stats = db.getStatistik();
  const terapisList = db.getTerapisList();

  const ADMIN_CONTACTS = [
    {
      id: 'admin-1',
      nama: 'Sugeng',
      role: 'Admin 1 ULD Kota Probolinggo',
      waNumber: '6285236028521',
      waFormatted: '0852-3602-8521',
      waUrl: 'https://wa.me/6285236028521?text=Halo%20Pak%20Sugeng%20(Admin%201%20ULD%20Kota%20Probolinggo),%20saya%20ingin%20berkonsultasi%20mengenai%20jadwal%20terapi%20atau%20asesmen...'
    },
    {
      id: 'admin-2',
      nama: 'Helmi',
      role: 'Admin 2 ULD Kota Probolinggo',
      waNumber: '6282247952696',
      waFormatted: '0822-4795-2696',
      waUrl: 'https://wa.me/6282247952696?text=Halo%20Pak%20Helmi%20(Admin%202%20ULD%20Kota%20Probolinggo),%20saya%20ingin%20berkonsultasi%20mengenai%20jadwal%20terapi%20atau%20asesmen...'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Super Simple Banner Header */}
      <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg text-center sm:text-left relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-800/80 border border-teal-600/50 text-xs font-semibold text-teal-200">
            <span>🏛️ Pemerintah Kota Probolinggo</span>
            <span>·</span>
            <span>Layanan Inklusi Gratis</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Unit Layanan Disabilitas (ULD) Kota Probolinggo
          </h1>

          <p className="text-sm sm:text-base text-teal-100 max-w-2xl leading-relaxed">
            Sistem pendaftaran jadwal terapi rutin dan pemantauan tumbuh kembang terpadu untuk anak berkebutuhan khusus.
          </p>

          {/* Jam Layanan Highlight */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-teal-950/70 border border-teal-500/40 text-xs sm:text-sm font-bold text-amber-300">
            <span className="text-base">🕒</span>
            <span>Jadwal Terapi: Setiap Hari Senin – Jumat, Pukul 09.00 – 13.00 WIB</span>
          </div>
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />
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
          <div className="bg-white rounded-3xl p-6 border-2 border-teal-700/30 hover:border-teal-700 transition-all shadow-sm flex flex-col justify-between space-y-4 group">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-800 text-2xl flex items-center justify-center font-bold">
                🧒
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-900 font-bold text-[11px] inline-block">
                Sudah Terdaftar di ULD
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-teal-800 transition-colors">
                Siswa Terapi Rutin
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tinggal pilih nama anak dari <strong>drop down</strong> dan masukkan <strong>PIN pribadi</strong>. Maksimal 1x pendaftaran dalam seminggu untuk pemerataan kuota layanan.
              </p>
            </div>

            <button
              onClick={() => navigateTo('/login-peserta')}
              className="w-full py-3.5 px-4 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-teal-600 transition-all shadow-sm flex flex-col justify-between space-y-4">
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
              onClick={() => navigateTo('/admin')}
              className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs transition-all border border-slate-300"
            >
              Masuk Loket Admin ULD →
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
          {ADMIN_CONTACTS.map(adm => (
            <div 
              key={adm.id}
              className="p-4 rounded-2xl bg-emerald-900/70 border border-emerald-700/80 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-base">{adm.nama}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-800 text-emerald-200 font-mono">
                    {adm.role.split(' ')[0]} {adm.role.split(' ')[1]}
                  </span>
                </div>
                <div className="text-xs text-emerald-300 font-mono mt-1">
                  WhatsApp: <strong>{adm.waFormatted}</strong> ({adm.waNumber})
                </div>
              </div>

              <a
                href={adm.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-xs shadow transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>💬 Chat WA {adm.nama}</span>
                <span>→</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* LOKASI ULD KOTA PROBOLINGGO & LINK GOOGLE MAPS PROMINEN */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-teal-800/20 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 uppercase tracking-wider">
              <span>📍 Lokasi Kantor & Tempat Terapi Langsung</span>
            </div>
            <h3 className="text-xl font-black text-slate-900">
              Gedung Unit Layanan Disabilitas Kota Probolinggo
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Jl. Panglima Sudirman No. 19, Kec. Kanigaran, Kota Probolinggo, Jawa Timur 67211
            </p>
          </div>

          <a
            href="https://maps.app.goo.gl/GQMgh5fjzEFKwEYt8"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
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
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3953.167812988451!2d113.212356!3d-7.755018!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7adc56c071d71%3A0x633918a59be83e39!2sJl.%20Panglima%20Sudirman%20No.19%2C%20Kanigaran%2C%20Kec.%20Kanigaran%2C%20Kota%20Probolinggo%2C%20Jawa%20Timur%2067211!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
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
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              4 Pilar Layanan Tenaga Ahli ULD
            </h2>
            <p className="text-xs text-slate-500">
              Didukung oleh psikolog, terapis perilaku, fisioterapis, dan pendidik luar biasa.
            </p>
          </div>
          <button
            onClick={() => navigateTo('/panduan-layanan')}
            className="text-xs font-semibold text-teal-800 hover:underline hidden sm:block"
          >
            Lihat Panduan & SOP →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {terapisList.map((t) => (
            <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 hover:border-teal-300 transition-colors">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">
                {t.spesialisasiLabel}
              </span>
              <div className="font-bold text-slate-900 text-sm">{t.nama}</div>
              <div className="text-[11px] text-slate-500">{t.gelar}</div>
              <div className="text-[11px] text-slate-600 pt-1 line-clamp-2">
                {t.deskripsi}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
