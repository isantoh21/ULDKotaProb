import json
import re
import os
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# NumberedCanvas for footer with page numbers
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Check orientation
        width = self._pagesize[0]
        text = f"Halaman {self._pageNumber} dari {page_count}  |  Unit Layanan Disabilitas (ULD) Kota Probolinggo - Dokumen Rahasia & Resmi"
        self.drawRightString(width - 36, 20, text)
        self.drawString(36, 20, "Dicetak pada: 25 September 2026")
        
        # Draw a thin line above footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 30, width - 36, 30)
        
        self.restoreState()

def extract_data_from_initial_data():
    with open('src/services/initialData.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract Admins
    admins = [
        {
            "id": "admin-1",
            "nama": "Sugeng",
            "roleTitle": "Admin 1 ULD Kota Probolinggo",
            "pin": "990011",
            "nomorTelepon": "0852-3602-8521"
        },
        {
            "id": "admin-2",
            "nama": "Helmi",
            "roleTitle": "Admin 2 ULD Kota Probolinggo",
            "pin": "990022",
            "nomorTelepon": "0822-4795-2696"
        }
    ]

    # Extract Terapis
    terapis = [
        {
            "id": "terapis-1",
            "nipOrId": "TP-AHMAD-01",
            "nama": "Ahmad Hafizul Adly, S.Pd.",
            "gelar": "Terapis Perilaku (Behavior Therapist)",
            "spesialisasiLabel": "Terapis Perilaku",
            "pin": "223344",
            "nomorTelepon": "0812-3456-7891",
            "ruangPraktek": "Ruang Terapi Perilaku & Sensori 1"
        },
        {
            "id": "terapis-2",
            "nipOrId": "FT-INDARYATI-02",
            "nama": "Indaryati Machmudi A.Md.Ft.",
            "gelar": "Fisioterapis Pediatrik",
            "spesialisasiLabel": "Fisioterapis",
            "pin": "445566",
            "nomorTelepon": "0812-3456-7892",
            "ruangPraktek": "Ruang Fisioterapi Gimnasium Inklusif"
        },
        {
            "id": "terapis-3",
            "nipOrId": "PLB-SALMA-03",
            "nama": "Salma Salwa Salsabila, S.Pd.",
            "gelar": "Tenaga Pendidikan Luar Biasa (PLB)",
            "spesialisasiLabel": "Tenaga PLB",
            "pin": "334455",
            "nomorTelepon": "0812-3456-7893",
            "ruangPraktek": "Ruang Edukasi & Remedial PLB"
        },
        {
            "id": "terapis-4",
            "nipOrId": "PSI-IKHSAN-04",
            "nama": "Muhammad Ikhsan, M.Psi., Psikolog",
            "gelar": "Psikolog Klinis & Disabilitas",
            "spesialisasiLabel": "Psikolog",
            "pin": "112233",
            "nomorTelepon": "0812-3456-7894",
            "ruangPraktek": "Ruang Konsultasi & Observasi Psikologi"
        }
    ]

    # Extract Peserta regex
    peserta_pattern = re.compile(
        r"id:\s*['\"]([^'\"]+)['\"].*?"
        r"nomorRekamMedis:\s*['\"]([^'\"]+)['\"].*?"
        r"namaLengkap:\s*['\"]([^'\"]+)['\"].*?"
        r"pin:\s*['\"]([^'\"]+)['\"].*?"
        r"tanggalLahir:\s*['\"]([^'\"]+)['\"].*?"
        r"jenisKelamin:\s*['\"]([^'\"]+)['\"].*?"
        r"namaWali:\s*['\"]([^'\"]+)['\"].*?"
        r"nomorTelepon:\s*['\"]([^'\"]+)['\"].*?"
        r"alamat:\s*['\"]([^'\"]+)['\"].*?"
        r"kecamatan:\s*['\"]([^'\"]+)['\"].*?"
        r"(?:asalSekolah:\s*['\"]([^'\"]*)['\"].*?)?"
        r"ragamDisabilitas:\s*['\"]([^'\"]+)['\"].*?"
        r"(?:assignedTerapisNama:\s*['\"]([^'\"]*)['\"])?",
        re.DOTALL
    )

    # Split INITIAL_PESERTA block
    start_idx = content.find("export const INITIAL_PESERTA: Peserta[] = [")
    peserta_block = content[start_idx:]
    end_idx = peserta_block.find("];\n\nexport const INITIAL_SLOTS")
    if end_idx != -1:
        peserta_block = peserta_block[:end_idx]

    peserta_items = []
    # Match each object { ... }
    obj_matches = re.findall(r"\{([^{}]+)\}", peserta_block)
    for obj in obj_matches:
        get_field = lambda key: (re.search(rf"{key}:\s*['\"]([^'\"]*)['\"]", obj).group(1) if re.search(rf"{key}:\s*['\"]([^'\"]*)['\"]", obj) else "")
        rm = get_field("nomorRekamMedis")
        if not rm:
            continue
        peserta_items.append({
            "id": get_field("id"),
            "nomorRekamMedis": rm,
            "namaLengkap": get_field("namaLengkap"),
            "pin": get_field("pin") or "123456",
            "tanggalLahir": get_field("tanggalLahir"),
            "jenisKelamin": get_field("jenisKelamin"),
            "namaWali": get_field("namaWali"),
            "nomorTelepon": get_field("nomorTelepon"),
            "alamat": get_field("alamat"),
            "kecamatan": get_field("kecamatan"),
            "asalSekolah": get_field("asalSekolah") or "-",
            "ragamDisabilitas": get_field("ragamDisabilitas"),
            "assignedTerapisNama": get_field("assignedTerapisNama") or "Belum Di-assign"
        })

    return admins, terapis, peserta_items

def generate_pdf_pekerja(admins, terapis, filename="PIN_PEKERJA_ULD.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        alignment=1 # Center
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        alignment=1 # Center
    )

    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#115e59'),
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e293b')
    )

    body_bold = ParagraphStyle(
        'BodyCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f172a')
    )

    pin_style = ParagraphStyle(
        'PinCell',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=10,
        leading=12,
        textColor=colors.HexColor('#134e4a'),
        alignment=1 # Center
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1
    )

    elements = []

    # Kop Surat / Header Formal
    elements.append(Paragraph("PEMERINTAH KOTA PROBOLINGGO", ParagraphStyle('H0', fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=colors.HexColor('#0f172a'))))
    elements.append(Paragraph("DINAS KESEHATAN, PENGENDALIAN PENDUDUK DAN KELUARGA BERENCANA", ParagraphStyle('H01', fontName='Helvetica-Bold', fontSize=10, alignment=1, textColor=colors.HexColor('#0f172a'))))
    elements.append(Paragraph("UNIT LAYANAN DISABILITAS (ULD) KOTA PROBOLINGGO", ParagraphStyle('H02', fontName='Helvetica-Bold', fontSize=13, alignment=1, textColor=colors.HexColor('#115e59'))))
    elements.append(Paragraph("Jl. KH. Mansur No. 92 B, Kel. Mangunharjo, Kec. Mayangan, Kota Probolinggo · Telp/WA: 0852-3602-8521", subtitle_style))
    elements.append(Spacer(1, 8))

    # Garis Pembatas Kop
    divider = Table([[""]], colWidths=[523], rowHeights=[2])
    divider.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#115e59')),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(divider)
    elements.append(Spacer(1, 10))

    # Judul Dokumen
    elements.append(Paragraph("DAFTAR KREDENSIAL & PIN LOGIN PEKERJA ULD", title_style))
    elements.append(Paragraph("Dokumen Resmi & Rahasia Untuk Tenaga Ahli / Terapis dan Petugas Admin Loket", subtitle_style))
    elements.append(Spacer(1, 12))

    # 1. BAGIAN TENAGA AHLI / TERAPIS
    elements.append(Paragraph("1. TENAGA AHLI & PSIKOLOG ULD KOTA PROBOLINGGO", section_style))
    
    t_headers = [
        Paragraph("No", table_header_style),
        Paragraph("ID / NIP", table_header_style),
        Paragraph("Nama Lengkap & Gelar", table_header_style),
        Paragraph("Bidang Layanan", table_header_style),
        Paragraph("Ruang Praktek", table_header_style),
        Paragraph("Kontak WA", table_header_style),
        Paragraph("PIN Login", table_header_style)
    ]
    t_data = [t_headers]
    for idx, t in enumerate(terapis, 1):
        t_data.append([
            Paragraph(str(idx), body_style),
            Paragraph(t["nipOrId"], body_bold),
            Paragraph(f"<b>{t['nama']}</b><br/><font color='#64748b' size='7'>{t['gelar']}</font>", body_style),
            Paragraph(t["spesialisasiLabel"], body_style),
            Paragraph(t["ruangPraktek"], body_style),
            Paragraph(t["nomorTelepon"], body_style),
            Paragraph(f"<b>{t['pin']}</b>", pin_style)
        ])

    table_terapis = Table(t_data, colWidths=[25, 75, 135, 75, 105, 60, 48])
    table_terapis.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#115e59')),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (-1,1), (-1,-1), colors.HexColor('#ccfbf1')), # Highlight PIN
        ('ROWBACKGROUNDS', (0,1), (-2,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(table_terapis)
    elements.append(Spacer(1, 14))

    # 2. BAGIAN ADMIN LOKET
    elements.append(Paragraph("2. PETUGAS ADMIN LOKET & OPERASIONAL ULD", section_style))
    
    a_headers = [
        Paragraph("No", table_header_style),
        Paragraph("ID Admin", table_header_style),
        Paragraph("Nama Petugas", table_header_style),
        Paragraph("Jabatan / Tanggung Jawab", table_header_style),
        Paragraph("No. WhatsApp Resmi", table_header_style),
        Paragraph("PIN Login", table_header_style)
    ]
    a_data = [a_headers]
    for idx, a in enumerate(admins, 1):
        a_data.append([
            Paragraph(str(idx), body_style),
            Paragraph(a["id"], body_bold),
            Paragraph(f"<b>{a['nama']}</b>", body_style),
            Paragraph(a["roleTitle"], body_style),
            Paragraph(a["nomorTelepon"], body_style),
            Paragraph(f"<b>{a['pin']}</b>", pin_style)
        ])

    table_admin = Table(a_data, colWidths=[25, 75, 110, 160, 95, 58])
    table_admin.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#134e4a')),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (-1,1), (-1,-1), colors.HexColor('#fef3c7')), # Highlight PIN Admin
        ('ROWBACKGROUNDS', (0,1), (-2,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(table_admin)
    elements.append(Spacer(1, 16))

    # Kotak Ketentuan Keamanan & SOP
    sop_content = [
        Paragraph("<b>KETENTUAN OPERASIONAL & KEAMANAN KREDENSIAL PEKERJA ULD:</b>", ParagraphStyle('SopTitle', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.HexColor('#854d0e'))),
        Paragraph("1. PIN login terdiri dari 6 digit angka dan berfungsi sebagai autentikasi resmi saat masuk ke panel kerja masing-masing tenaga ahli maupun loket admin.", ParagraphStyle('Sop1', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#713f12'))),
        Paragraph("2. Tenaga ahli dapat memperbarui PIN secara mandiri melalui tombol <b>'🔑 Ubah PIN Saya'</b> pada profil portal terapis.", ParagraphStyle('Sop2', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#713f12'))),
        Paragraph("3. Petugas loket admin dapat melayani pendaftaran sesi terapi langsung, mencetak tiket terapi, dan manajemen data siswa serta reset PIN siswa.", ParagraphStyle('Sop3', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#713f12'))),
        Paragraph("4. Dokumen ini bersifat RAHASIA dan hanya diperuntukkan bagi lingkungan internal ULD Kota Probolinggo.", ParagraphStyle('Sop4', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#991b1b')))
    ]
    sop_table = Table([[sop_content]], colWidths=[523])
    sop_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fefce8')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fde047')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(sop_table)

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"Success: {filename} generated.")

def generate_pdf_peserta(peserta_items, filename="PIN_PESERTA_TERAPI_ULD.pdf"):
    # Landscape A4 for wide table
    doc = SimpleDocTemplate(
        filename,
        pagesize=landscape(A4),
        leftMargin=30,
        rightMargin=30,
        topMargin=30,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        alignment=1
    )

    body_style = ParagraphStyle(
        'BodyCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1e293b')
    )

    body_bold = ParagraphStyle(
        'BodyCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0f172a')
    )

    pin_style = ParagraphStyle(
        'PinCell',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#0f766e'),
        alignment=1
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white,
        alignment=1
    )

    elements = []

    # Header
    elements.append(Paragraph("PEMERINTAH KOTA PROBOLINGGO — UNIT LAYANAN DISABILITAS (ULD)", ParagraphStyle('H0', fontName='Helvetica-Bold', fontSize=11, alignment=1, textColor=colors.HexColor('#0f172a'))))
    elements.append(Paragraph("DAFTAR KREDENSIAL & PIN LOGIN SISWA TERAPI RUTIN ULD KOTA PROBOLINGGO", title_style))
    elements.append(Paragraph(f"Data Resmi Akun Siswa Terdaftar (Total: {len(peserta_items)} Siswa Terapi Aktif) · Periode Tahun 2026", subtitle_style))
    elements.append(Spacer(1, 8))

    # Table
    p_headers = [
        Paragraph("No", table_header_style),
        Paragraph("No. Rekam Medis", table_header_style),
        Paragraph("Nama Lengkap Siswa", table_header_style),
        Paragraph("L/P", table_header_style),
        Paragraph("Nama Orang Tua / Wali", table_header_style),
        Paragraph("No. Telepon / WA", table_header_style),
        Paragraph("Asal Sekolah", table_header_style),
        Paragraph("Kecamatan", table_header_style),
        Paragraph("Ragam Layanan Terapi", table_header_style),
        Paragraph("Terapis Pembina Tetap", table_header_style),
        Paragraph("PIN Login", table_header_style)
    ]
    p_data = [p_headers]

    for idx, p in enumerate(peserta_items, 1):
        p_data.append([
            Paragraph(str(idx), body_style),
            Paragraph(f"<b>{p['nomorRekamMedis']}</b>", body_style),
            Paragraph(f"<b>{p['namaLengkap']}</b>", body_bold),
            Paragraph(p['jenisKelamin'], body_style),
            Paragraph(p['namaWali'], body_style),
            Paragraph(p['nomorTelepon'], body_style),
            Paragraph(p['asalSekolah'], body_style),
            Paragraph(p['kecamatan'], body_style),
            Paragraph(p['ragamDisabilitas'], body_style),
            Paragraph(p['assignedTerapisNama'], body_style),
            Paragraph(f"<b>{p['pin']}</b>", pin_style)
        ])

    # Width: total available on landscape A4 (842 - 60 = 782)
    # [22, 90, 115, 20, 95, 70, 85, 55, 95, 85, 50] = 782
    table_peserta = Table(
        p_data,
        colWidths=[22, 90, 115, 20, 95, 70, 85, 55, 95, 85, 50],
        repeatRows=1
    )
    table_peserta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f766e')),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('ALIGN', (3,0), (3,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (-1,1), (-1,-1), colors.HexColor('#ccfbf1')), # Highlight PIN
        ('ROWBACKGROUNDS', (0,1), (-2,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    elements.append(table_peserta)
    elements.append(Spacer(1, 10))

    # Notes
    p_notes = [
        Paragraph("<b>PETUNJUK PENGGUNAAN KREDENSIAL OLEH SISWA / WALI MURID:</b>", ParagraphStyle('PNoteT', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#134e4a'))),
        Paragraph("1. Siswa / orang tua masuk ke portal dengan memilih nama siswa dari drop down dan memasukkan PIN 6 digit di atas.", ParagraphStyle('P1', fontName='Helvetica', fontSize=7.5, textColor=colors.HexColor('#1e293b'))),
        Paragraph("2. Siswa hanya dapat mendaftar ke sesi tenaga ahli / terapis pembina yang telah ditetapkan.", ParagraphStyle('P2', fontName='Helvetica', fontSize=7.5, textColor=colors.HexColor('#1e293b'))),
        Paragraph("3. Pendaftaran dibatasi maksimal 1 kali dalam sepekan kalender demi pemerataan kuota, dan minimal dilakukan H-1 hari maksimal pukul 24.00 WIB.", ParagraphStyle('P3', fontName='Helvetica', fontSize=7.5, textColor=colors.HexColor('#1e293b'))),
        Paragraph("4. Peserta berhak memindahkan jadwal mandiri maksimal 1 kali (reschedule) apabila salah memilih hari dan waktu.", ParagraphStyle('P4', fontName='Helvetica-Bold', fontSize=7.5, textColor=colors.HexColor('#0f766e')))
    ]
    notes_table = Table([[p_notes]], colWidths=[782])
    notes_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdfa')),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor('#99f6e4')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(notes_table)

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"Success: {filename} generated.")

if __name__ == "__main__":
    admins, terapis, peserta_items = extract_data_from_initial_data()
    print(f"Parsed {len(admins)} admins, {len(terapis)} terapis, {len(peserta_items)} peserta.")
    generate_pdf_pekerja(admins, terapis, "PIN_PEKERJA_ULD.pdf")
    generate_pdf_peserta(peserta_items, "PIN_PESERTA_TERAPI_ULD.pdf")
    # Also save copies into public/ directory so users can download them via web app!
    os.makedirs("public/pdf", exist_ok=True)
    generate_pdf_pekerja(admins, terapis, "public/pdf/PIN_PEKERJA_ULD.pdf")
    generate_pdf_peserta(peserta_items, "public/pdf/PIN_PESERTA_TERAPI_ULD.pdf")
