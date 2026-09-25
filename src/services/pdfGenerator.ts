import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Peserta, Terapis, AdminUser } from '../types';

/**
 * Format tanggal Indonesia lengkap dengan jam WIB
 */
function getFormattedWIBNow(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  return new Intl.DateTimeFormat('id-ID', options).format(now) + ' WIB';
}

/**
 * Unduh Dokumen PDF Resmi Daftar PIN Siswa Terapi ULD Kota Probolinggo
 * Mengambil data siswa dan PIN secara dinamis & real-time dari database
 */
export function downloadPdfPinSiswaTerbaru(pesertaList: Peserta[]): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const timestamp = getFormattedWIBNow();
  const dateFile = new Date().toISOString().split('T')[0];

  // Header Dokumen
  doc.setFillColor(14, 116, 144); // Sky/Teal 700
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PEMERINTAH KOTA PROBOLINGGO', 105, 10, { align: 'center' });

  doc.setFontSize(12);
  doc.text('UNIT LAYANAN DISABILITAS (ULD) KOTA PROBOLINGGO', 105, 17, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Sistem Informasi Pendaftaran Terapi & Layanan Inklusif Terpadu', 105, 23, { align: 'center' });

  // Judul Laporan
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DOKUMEN RAHASIA: DAFTAR PIN PRIBADI SISWA TERAPI', 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text(`Waktu Cetak Real-Time: ${timestamp}`, 14, 44);
  doc.text(`Total Siswa Aktif: ${pesertaList.length} Anak Terdaftar`, 14, 49);

  // Garis Pemisah
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 52, 196, 52);

  // Siapkan Data Tabel
  const tableRows = pesertaList.map((p, idx) => [
    idx + 1,
    p.nomorRekamMedis,
    p.namaLengkap,
    p.asalSekolah || '-',
    p.namaWali,
    p.pin,
    p.assignedTerapisNama || 'Belum Di-assign'
  ]);

  // Buat Tabel dengan autoTable
  autoTable(doc, {
    startY: 55,
    head: [[
      'No',
      'No. RM',
      'Nama Siswa',
      'Asal Sekolah',
      'Orang Tua / Wali',
      'PIN Login',
      'Terapis Pembina'
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [3, 105, 161], // Sky 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 32 },
      2: { fontStyle: 'bold', cellWidth: 42 },
      3: { cellWidth: 32 },
      4: { cellWidth: 30 },
      5: { halign: 'center', fontStyle: 'bold', textColor: [3, 105, 161], cellWidth: 20 },
      6: { cellWidth: 32 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate 50
    },
    didDrawPage: (data) => {
      // Footer Halaman
      const str = `Halaman ${data.pageNumber} | ULD Kota Probolinggo - Rahasia & Hak Akses Terbatas`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 105, 290, { align: 'center' });
    }
  });

  // Unduh File PDF
  doc.save(`PIN_SISWA_ULD_${dateFile}.pdf`);
}

/**
 * Unduh Dokumen PDF Resmi Daftar PIN Pekerja & Tenaga Ahli ULD
 * Mengambil data terapis, psikolog, dan admin loket secara dinamis
 */
export function downloadPdfPinPekerjaTerbaru(terapisList: Terapis[], adminList: AdminUser[]): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const timestamp = getFormattedWIBNow();
  const dateFile = new Date().toISOString().split('T')[0];

  // Header Dokumen
  doc.setFillColor(30, 58, 138); // Blue 900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PEMERINTAH KOTA PROBOLINGGO', 105, 10, { align: 'center' });

  doc.setFontSize(12);
  doc.text('UNIT LAYANAN DISABILITAS (ULD) KOTA PROBOLINGGO', 105, 17, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Sistem Informasi Pendaftaran Terapi & Layanan Inklusif Terpadu', 105, 23, { align: 'center' });

  // Judul Laporan
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DOKUMEN RAHASIA: DAFTAR PIN PEKERJA & TENAGA AHLI ULD', 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Waktu Cetak Real-Time: ${timestamp}`, 14, 44);
  doc.text(`Total Pekerja Terdaftar: ${terapisList.length + adminList.length} Petugas/Tenaga Ahli`, 14, 49);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 52, 196, 52);

  // Sub-header 1: Tenaga Ahli & Psikolog
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 58, 138);
  doc.text('A. TENAGA AHLI TERAPIS & PSIKOLOG', 14, 58);

  const terapisRows = terapisList.map((t, idx) => [
    idx + 1,
    t.nipOrId || '-',
    t.nama,
    t.spesialisasiLabel,
    t.ruangPraktek || '-',
    t.nomorTelepon || '-',
    t.pin
  ]);

  autoTable(doc, {
    startY: 61,
    head: [[
      'No',
      'NIP / ID',
      'Nama Tenaga Ahli',
      'Spesialisasi',
      'Ruang Praktek',
      'WhatsApp',
      'PIN Akses'
    ]],
    body: terapisRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [30, 58, 138], // Blue 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 26 },
      2: { fontStyle: 'bold', cellWidth: 46 },
      3: { cellWidth: 36 },
      4: { cellWidth: 26 },
      5: { cellWidth: 26 },
      6: { halign: 'center', fontStyle: 'bold', textColor: [30, 58, 138], cellWidth: 20 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Sub-header 2: Petugas Administrasi Loket
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 140;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(3, 105, 161);
  doc.text('B. PETUGAS ADMINISTRASI LOKET ULD', 14, finalY);

  const adminRows = adminList.map((a, idx) => [
    idx + 1,
    a.id,
    a.nama,
    a.roleTitle,
    a.nomorTelepon || '-',
    a.pin
  ]);

  autoTable(doc, {
    startY: finalY + 3,
    head: [[
      'No',
      'ID Petugas',
      'Nama Petugas Loket',
      'Jabatan / Peran',
      'WhatsApp',
      'PIN Akses'
    ]],
    body: adminRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [3, 105, 161], // Sky 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 26 },
      2: { fontStyle: 'bold', cellWidth: 56 },
      3: { cellWidth: 50 },
      4: { cellWidth: 26 },
      5: { halign: 'center', fontStyle: 'bold', textColor: [3, 105, 161], cellWidth: 22 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      const str = `Halaman ${data.pageNumber} | ULD Kota Probolinggo - Rahasia & Hak Akses Terbatas`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 105, 290, { align: 'center' });
    }
  });

  doc.save(`PIN_PEKERJA_ULD_${dateFile}.pdf`);
}
