import React from 'react';
import { navigateTo } from '../services/router';

export const PanduanLayanan: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Title */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
          <span>Standar Operasional Prosedur (SOP)</span>
          <span aria-hidden="true">·</span>
          <span>Inklusi & Aksesibilitas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Panduan Layanan & Tata Tertib ULD Kota Probolinggo
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Informasi menyeluruh bagi masyarakat, calon pasien (guest), peserta terdaftar, dan tenaga ahli dalam mengakses serta mengelola layanan terapi inklusif.
        </p>
      </div>

      {/* 4 Pilar Tenaga Ahli */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
          4 Pilar Layanan Terapi & Intervensi Inklusif
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-2">
            <div className="font-bold text-teal-950 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-800 text-white flex items-center justify-center text-xs">1</span>
              <span>Terapis Perilaku (Behavior Therapy / ABA)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Fokus pada analisis perilaku terapan (ABA), perbaikan rentang atensi, kepatuhan instruksi, stimulasi kontak mata, kemandirian bina diri (toilet training/makan mandiri), serta modifikasi perilaku tantrum atau stereotipi motorik.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-2">
            <div className="font-bold text-teal-950 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-800 text-white flex items-center justify-center text-xs">2</span>
              <span>Fisioterapis Pediatrik</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Fokus pada stimulasi gerak motorik kasar, penguatan tonus otot, postur tegak, keseimbangan dinamis, koordinasi sendi, serta penanganan kondisi keterlambatan motorik seperti cerebral palsy, hipotonus, dan kelainan gait.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-2">
            <div className="font-bold text-teal-950 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-800 text-white flex items-center justify-center text-xs">3</span>
              <span>Tenaga Pendidikan Luar Biasa (PLB)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Mempersiapkan kesiapan anak bersekolah reguler atau sekolah inklusi, merancang Program Pembelajaran Individual (PPI), mengenalkan sistem komunikasi alternatif (PECS, simbol visual, isyarat dasar), serta remedial pra-akademik.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-2">
            <div className="font-bold text-teal-950 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-800 text-white flex items-center justify-center text-xs">4</span>
              <span>Psikolog</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Melakukan observasi diagnostik, asesmen psikologis mendalam, evaluasi kematangan mental dan sosial-emosional, serta pendampingan konseling keluarga. <strong>Catatan: Pendaftaran jadwal ke Psikolog khusus dijadwalkan melalui Petugas Admin di loket ULD (Pak Sugeng / Pak Helmi).</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Ketentuan Berkas Fisik & Verifikasi Langsung */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
          Ketentuan Asesmen Baru di Loket ULD
        </h2>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Penjadwalan asesmen baru <strong>dilakukan langsung oleh Petugas Admin</strong> (tidak ada pendaftaran mandiri di laman publik). Pada hari dan jam yang telah dijadwalkan oleh admin, orang tua wajib hadir langsung bersama anak ke Gedung ULD Kota Probolinggo dengan membawa:
          </p>

          <ul className="list-disc list-inside space-y-1.5 pl-2 font-medium text-slate-800">
            <li>Fotokopi Kartu Keluarga (KK) Kota Probolinggo (atau surat domisili)</li>
            <li>Fotokopi KTP Orang Tua / Wali Pendamping</li>
            <li>Buku Kesehatan Ibu dan Anak (Buku KIA Pink) atau riwayat tumbuh kembang balita</li>
            <li>Surat Rujukan Puskesmas / Dokter Spesialis Anak (jika sudah ada)</li>
            <li>Bukti terdaftar DAPODIK bagi jenjang PAUD – SMP</li>
          </ul>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <strong>Penetapan Akun Siswa:</strong> Setelah proses asesmen dan verifikasi berkas oleh admin, petugas akan membuatkan akun siswa terapi rutin (cukup nama, nama orang tua, dan PIN pribadi) untuk login pendaftaran terapi mingguan.
          </div>
        </div>
      </div>

      {/* Tata Tertib Sesi Terapi */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
          Tata Tertib Kehadiran Sesi Terapi
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900">Batas Kuota Mingguan</div>
            <p className="text-slate-500">
              Siswa terdaftar hanya dapat mendaftar maksimal 1 kali dalam 1 minggu demi pemerataan kuota layanan se-Kota Probolinggo.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900">Kehadiran Tepat Waktu</div>
            <p className="text-slate-500">
              Orang tua dan anak diharapkan tiba di lokasi 10 menit sebelum jam sesi dimulai untuk penyesuaian lingkungan.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900">Pembatalan Sesi</div>
            <p className="text-slate-500">
              Jika berhalangan sakit atau ada keperluan mendesak, batalkan jadwal melalui portal minimal 4 jam sebelum sesi agar slot dapat digunakan peserta lain.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900">Pakaian & Kenyamanan</div>
            <p className="text-slate-500">
              Kenakan pakaian yang longgar, lentur, dan menyerap keringat. Bawa botol minum dan perlengkapan kesayangan anak.
            </p>
          </div>
        </div>
      </div>

      {/* Lokasi & Kontak */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-white">
          Kontak & Alamat Unit Layanan Disabilitas Kota Probolinggo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div>
            <div className="font-bold text-teal-400">Alamat Kantor:</div>
            <div>Jl. Hayam Wuruk No. 63, Mangunharjo, Kec. Mayangan, Kota Probolinggo, Jawa Timur 67217</div>
            <div className="mt-2 font-bold text-teal-400">Jadwal Sesi Terapi:</div>
            <div>Senin – Jumat: Pukul 09.00 – 13.00 WIB (Sesi 1: 09-10, Sesi 2: 10-11, Sesi 3: 11-12, Sesi 4: 12-13)</div>
          </div>

          <div>
            <div className="font-bold text-teal-400">Layanan Informasi & WhatsApp Resmi:</div>
            <div className="font-mono space-y-0.5 mt-0.5">
              <div>Admin 1 (Sugeng): <strong>6285236028521</strong> (0852-3602-8521)</div>
              <div>Admin 2 (Helmi): <strong>6282247952696</strong> (0822-4795-2696)</div>
            </div>
            <div className="mt-2 font-bold text-teal-400">Status Pembiayaan:</div>
            <div className="text-emerald-400 font-semibold">Gratis / Subsidi Penuh APBD Pemerintah Kota Probolinggo</div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-3">
          <a
            href="https://wa.me/6285236028521?text=Halo%20Pak%20Sugeng%20(Admin%201%20ULD%20Kota%20Probolinggo),%20saya%20ingin%20berkonsultasi..."
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <span>💬 Chat Admin 1 (Sugeng)</span>
          </a>
          <a
            href="https://wa.me/6282247952696?text=Halo%20Pak%20Helmi%20(Admin%202%20ULD%20Kota%20Probolinggo),%20saya%20ingin%20berkonsultasi..."
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <span>💬 Chat Admin 2 (Helmi)</span>
          </a>
          <button
            onClick={() => navigateTo('/daftar-jadwal')}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-semibold text-xs hover:bg-slate-700 transition-colors"
          >
            Lihat Jadwal Terapi Publik
          </button>
        </div>
      </div>
    </div>
  );
};
