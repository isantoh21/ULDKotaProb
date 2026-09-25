import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { db } from '../services/supabase';
import { navigateTo } from '../services/router';

export const GuestAsesmen: React.FC = () => {
  const [formData, setFormData] = useState({
    namaAnak: '',
    tanggalLahir: '',
    jenisKelamin: 'L' as 'L' | 'P',
    namaOrangTua: '',
    nikAnakOrKK: '',
    nomorWhatsApp: '',
    alamatDomisili: '',
    kecamatan: 'Kanigaran',
    jenjangPendidikan: 'SD/MI' as 'PAUD/TK' | 'SD/MI' | 'SMP/MTs',
    asalSekolah: '',
    nisnOrNpsn: '',
    sudahTerdaftarDapodik: false,
    indikasiAwal: '',
    catatanTambahan: '',
    dokumenAkanDibawa: [
      'Kartu Keluarga (KK)',
      'KTP Orang Tua/Wali',
      'Buku KIA Pink',
      'Bukti Terdaftar DAPODIK / Surat Keterangan Sekolah'
    ],
    tanggalRencanaDatang: '',
    jamRencanaDatang: '08:30 WIB'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Get tomorrow's date for minimum date picker
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleCheckboxChange = (docName: string) => {
    setFormData(prev => {
      const exists = prev.dokumenAkanDibawa.includes(docName);
      if (exists) {
        return { ...prev, dokumenAkanDibawa: prev.dokumenAkanDibawa.filter(d => d !== docName) };
      } else {
        return { ...prev, dokumenAkanDibawa: [...prev.dokumenAkanDibawa, docName] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.namaAnak.trim()) {
      setErrorMsg('Nama lengkap calon peserta didik wajib diisi.');
      return;
    }
    if (!formData.tanggalLahir) {
      setErrorMsg('Tanggal lahir calon peserta wajib diisi.');
      return;
    }
    if (!formData.asalSekolah.trim()) {
      setErrorMsg('Nama asal sekolah PAUD - SMP di Kota Probolinggo wajib diisi.');
      return;
    }
    if (!formData.nisnOrNpsn.trim()) {
      setErrorMsg('Nomor Induk Siswa Nasional (NISN) atau NPSN sekolah wajib diisi untuk verifikasi data DAPODIK.');
      return;
    }
    if (!formData.sudahTerdaftarDapodik) {
      setErrorMsg('Pendaftaran baru hanya berlaku bagi peserta didik yang sudah terdaftar resmi di DAPODIK. Harap centang pernyataan konfirmasi DAPODIK.');
      return;
    }
    if (!formData.namaOrangTua.trim()) {
      setErrorMsg('Nama orang tua atau wali wajib diisi.');
      return;
    }
    if (!formData.nomorWhatsApp.trim()) {
      setErrorMsg('Nomor WhatsApp wajib diisi agar petugas ULD dapat mengonfirmasi jadwal.');
      return;
    }
    if (!formData.indikasiAwal.trim()) {
      setErrorMsg('Harap jelaskan dugaan keluhan atau kebutuhan asesmen awal.');
      return;
    }
    if (!formData.tanggalRencanaDatang) {
      setErrorMsg('Silakan pilih tanggal rencana kedatangan langsung untuk verifikasi dokumen fisik.');
      return;
    }

    setIsSubmitting(true);

    try {
      const combinedIndikasi = formData.catatanTambahan 
        ? `${formData.indikasiAwal}. Catatan: ${formData.catatanTambahan}` 
        : formData.indikasiAwal;

      const newRegistration = db.daftarAsesmenGuest({
        namaAnak: formData.namaAnak.trim(),
        tanggalLahir: formData.tanggalLahir,
        jenisKelamin: formData.jenisKelamin,
        namaOrangTua: formData.namaOrangTua.trim(),
        nikAnakOrKK: formData.nikAnakOrKK.trim() || '-',
        nomorWhatsApp: formData.nomorWhatsApp.trim(),
        alamatDomisili: formData.alamatDomisili.trim() || 'Kota Probolinggo',
        kecamatan: formData.kecamatan,
        jenjangPendidikan: formData.jenjangPendidikan,
        asalSekolah: formData.asalSekolah.trim(),
        nisnOrNpsn: formData.nisnOrNpsn.trim(),
        sudahTerdaftarDapodik: formData.sudahTerdaftarDapodik,
        indikasiAwal: combinedIndikasi,
        dokumenAkanDibawa: formData.dokumenAkanDibawa,
        tanggalRencanaDatang: formData.tanggalRencanaDatang,
        jamRencanaDatang: formData.jamRencanaDatang
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Navigate to ticket view
      setTimeout(() => {
        navigateTo('/tiket-asesmen', { id: newRegistration.id });
      }, 400);
    } catch {
      setErrorMsg('Terjadi kesalahan saat menyimpan pendaftaran. Silakan coba kembali.');
      setIsSubmitting(false);
    }
  };

  const setPresetIndikasi = (preset: string) => {
    setFormData(prev => ({ ...prev, indikasiAwal: preset }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
          <span>Unit Layanan Disabilitas Kota Probolinggo</span>
          <span aria-hidden="true">·</span>
          <span>Pendaftaran Asesmen Guest</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Formulir Pendaftaran Asesmen Awal Inklusi
        </h1>

        {/* Syarat Khusus DAPODIK PAUD - SMP Kota Probolinggo */}
        <div className="p-4 rounded-2xl bg-teal-900 text-white space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-teal-300">
            <span className="text-base">⚠️</span>
            <span>Ketentuan Wajib Pendaftaran Peserta Didik Baru:</span>
          </div>
          <p className="text-xs text-teal-100 leading-relaxed">
            Pendaftaran asesmen baru <strong>hanya diperuntukkan bagi peserta didik jenjang PAUD/TK, SD/MI, dan SMP/MTs di wilayah Kota Probolinggo yang sudah terdaftar resmi di DAPODIK (Data Pokok Pendidikan)</strong>.
          </p>
        </div>

        {/* Alamat ULD & Tombol Google Maps */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-slate-900">Lokasi Kantor ULD Kota Probolinggo:</div>
            <div className="text-slate-600 mt-0.5">
              Gedung Unit Layanan Disabilitas Kota Probolinggo (Gedung Pelayanan Terpadu Inklusi)
            </div>
          </div>
          <a
            href="https://maps.app.goo.gl/GQMgh5fjzEFKwEYt8"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0"
          >
            <span>📍 Buka Google Maps ULD</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Identitas Anak / Calon Peserta */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
            <span>1. Identitas Calon Peserta Didik</span>
            <span className="text-xs font-normal text-slate-400">* Wajib diisi</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap Anak / Peserta Didik *
              </label>
              <input
                type="text"
                required
                value={formData.namaAnak}
                onChange={e => setFormData({ ...formData, namaAnak: e.target.value })}
                placeholder="Contoh: Muhammad Rayyan Firdaus"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Lahir *
              </label>
              <input
                type="date"
                required
                value={formData.tanggalLahir}
                onChange={e => setFormData({ ...formData, tanggalLahir: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Kelamin *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, jenisKelamin: 'L' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${formData.jenisKelamin === 'L' ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Laki-Laki
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, jenisKelamin: 'P' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${formData.jenisKelamin === 'P' ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Perempuan
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIK Anak atau Nomor KK (16 Digit)
              </label>
              <input
                type="text"
                value={formData.nikAnakOrKK}
                onChange={e => setFormData({ ...formData, nikAnakOrKK: e.target.value })}
                placeholder="3574xxxxxxxxxxxx"
                maxLength={16}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Data Sekolah & Status DAPODIK (PAUD - SMP) */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
            2. Data Sekolah & Konfirmasi DAPODIK Kota Probolinggo
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenjang Pendidikan *
              </label>
              <select
                value={formData.jenjangPendidikan}
                onChange={e => setFormData({ ...formData, jenjangPendidikan: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm bg-white font-medium"
              >
                <option value="PAUD/TK">PAUD / TK / RA</option>
                <option value="SD/MI">SD / MI / SDLB</option>
                <option value="SMP/MTs">SMP / MTs / SMPLB</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asal Sekolah di Kota Probolinggo *
              </label>
              <input
                type="text"
                required
                value={formData.asalSekolah}
                onChange={e => setFormData({ ...formData, asalSekolah: e.target.value })}
                placeholder="Contoh: TK Kemuning / SDN Mangunharjo 10 / SMPN 3"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Induk Siswa Nasional (NISN) / NPSN Sekolah *
              </label>
              <input
                type="text"
                required
                value={formData.nisnOrNpsn}
                onChange={e => setFormData({ ...formData, nisnOrNpsn: e.target.value })}
                placeholder="Contoh NISN 10 digit atau NPSN Sekolah"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Digunakan untuk sinkronisasi data dengan sistem DAPODIK Dinas Pendidikan Kota Probolinggo.
              </span>
            </div>

            {/* Checkbox Konfirmasi DAPODIK Wajib */}
            <div className="sm:col-span-2">
              <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.sudahTerdaftarDapodik ? 'border-teal-600 bg-teal-50/70' : 'border-amber-300 bg-amber-50/60'}`}>
                <input
                  type="checkbox"
                  required
                  checked={formData.sudahTerdaftarDapodik}
                  onChange={e => setFormData({ ...formData, sudahTerdaftarDapodik: e.target.checked })}
                  className="w-5 h-5 text-teal-800 rounded focus:ring-teal-700 mt-0.5 shrink-0"
                />
                <div className="text-xs text-slate-800 leading-relaxed">
                  <strong className="text-slate-900 block font-bold mb-0.5">
                    Pernyataan Terdaftar di DAPODIK Kota Probolinggo *
                  </strong>
                  Saya menyatakan dengan sebenarnya bahwa calon peserta didik saat ini aktif bersekolah pada jenjang <strong>PAUD, SD, atau SMP di Kota Probolinggo</strong> dan <strong>sudah terdaftar resmi pada sistem DAPODIK</strong>.
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Data Orang Tua / Wali */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
            3. Data Orang Tua / Wali & Domisili
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Orang Tua / Wali *
              </label>
              <input
                type="text"
                required
                value={formData.namaOrangTua}
                onChange={e => setFormData({ ...formData, namaOrangTua: e.target.value })}
                placeholder="Nama Ayah/Ibu/Wali"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor WhatsApp Aktif *
              </label>
              <input
                type="tel"
                required
                value={formData.nomorWhatsApp}
                onChange={e => setFormData({ ...formData, nomorWhatsApp: e.target.value })}
                placeholder="Contoh: 081234567890"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kecamatan Domisili di Kota Probolinggo *
              </label>
              <select
                value={formData.kecamatan}
                onChange={e => setFormData({ ...formData, kecamatan: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm bg-white"
              >
                <option value="Kanigaran">Kecamatan Kanigaran</option>
                <option value="Mayangan">Kecamatan Mayangan</option>
                <option value="Wonoasih">Kecamatan Wonoasih</option>
                <option value="Kedopok">Kecamatan Kedopok</option>
                <option value="Kademangan">Kecamatan Kademangan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Rumah
              </label>
              <input
                type="text"
                value={formData.alamatDomisili}
                onChange={e => setFormData({ ...formData, alamatDomisili: e.target.value })}
                placeholder="Nama jalan, RT/RW, Kelurahan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Indikasi & Kebutuhan Khusus */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
            4. Indikasi Kebutuhan Terapi / Keluhan Tumbuh Kembang
          </h2>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Pilih Gejala Dominan atau Tuliskan Bebas:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Keterlambatan Bicara (Speech Delay)',
                'Dugaan Spektrum Autisme (ASD)',
                'Keterlambatan Motorik / Fisioterapi',
                'Hambatan Belajar & Konsentrasi (PLB)',
                'Down Syndrome',
                'Cerebral Palsy',
                'Konsultasi Perilaku & Emosi Anak'
              ].map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPresetIndikasi(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${formData.indikasiAwal === item ? 'bg-teal-700 text-white font-medium' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  {item}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={2}
              value={formData.indikasiAwal}
              onChange={e => setFormData({ ...formData, indikasiAwal: e.target.value })}
              placeholder="Deskripsikan kondisi anak, misalnya: anak sulit fokus saat pelajaran di sekolah, ada hambatan gerak motorik atau wicara..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm mt-2"
            />
          </div>
        </div>

        {/* Section 5: Rencana Kedatangan Fisik & Dokumen yang Dibawa */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
            5. Jadwal Rencana Datang ke Lokasi ULD & Checklist Dokumen
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Tanggal Datang ke Gedung ULD *
              </label>
              <input
                type="date"
                required
                min={getMinDate()}
                value={formData.tanggalRencanaDatang}
                onChange={e => setFormData({ ...formData, tanggalRencanaDatang: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Senin - Jumat (08.00 - 14.30 WIB)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Perkiraan Jam Tiba *
              </label>
              <select
                value={formData.jamRencanaDatang}
                onChange={e => setFormData({ ...formData, jamRencanaDatang: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm bg-white"
              >
                <option value="08:30 WIB">Sesi Pagi A: 08:30 WIB</option>
                <option value="09:30 WIB">Sesi Pagi B: 09:30 WIB</option>
                <option value="10:30 WIB">Sesi Pagi C: 10:30 WIB</option>
                <option value="13:00 WIB">Sesi Siang: 13:00 WIB</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Dokumen Persyaratan yang Wajib Dibawa Saat Datang ke Lokasi ULD:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Bukti Terdaftar DAPODIK / Surat Keterangan Sekolah',
                'Kartu Keluarga (KK) Kota Probolinggo',
                'KTP Orang Tua/Wali',
                'Buku KIA Pink (Buku Kesehatan Ibu & Anak)',
                'Surat Rujukan Puskesmas / Resume Medis (Jika Ada)',
                'Pas Foto Anak 3x4 (2 Lembar)'
              ].map(doc => {
                const checked = formData.dokumenAkanDibawa.includes(doc);
                return (
                  <label
                    key={doc}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${checked ? 'bg-teal-50/70 border-teal-500 text-slate-900 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleCheckboxChange(doc)}
                      className="w-4 h-4 text-teal-800 rounded focus:ring-teal-700"
                    />
                    <span>{doc}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
          >
            ← Kembali ke Beranda
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-sm transition-all shadow-md transform active:scale-95 disabled:opacity-50 min-h-[48px]"
          >
            {isSubmitting ? 'Memproses...' : 'Kirim Pendaftaran & Dapatkan Bukti Asesmen'}
          </button>
        </div>
      </form>
    </div>
  );
};
