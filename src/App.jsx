import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import deleteLogo from "../src/public/assets/delete.webp";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const PENDANAAN_OPTIONS = ["Kas Departement", "Kas Gereja"];
const STORAGE_KEY = "activity-budget-planner-data";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateISOFromParts(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function formatDateDisplay(isoDate) {
  if (!isoDate) return "-";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${pad2(d)} ${MONTH_NAMES[m - 1]} ${y}`;
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatThousands(value) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseThousands(value) {
  return Number(String(value).replace(/\./g, "")) || 0;
}

function sortActivities(list) {
  return [...list].sort((a, b) => {
    const dtA = new Date(`${a.tanggal}T${a.waktu || "00:00"}`);
    const dtB = new Date(`${b.tanggal}T${b.waktu || "00:00"}`);
    return dtA - dtB;
  });
}

const emptyForm = {
  nama: "",
  tanggal: "",
  waktu: "",
  budget: "",
  fungsi: "",
  pendanaan: PENDANAAN_OPTIONS[0],
};

function loadSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Gagal membaca data tersimpan:", e);
    return null;
  }
}

export default function App() {
  const [departmentName, setDepartmentName] = useState("");
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const tableRef = useRef(null);
  const calendarRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ departmentName, activities, calendarYear }),
      );
    } catch (e) {
      console.warn("Gagal menyimpan data:", e);
    }
  }, [departmentName, activities, calendarYear]);

  const totalBudget = useMemo(
    () => activities.reduce((sum, a) => sum + (Number(a.budget) || 0), 0),
    [activities],
  );

  const activitiesByDate = useMemo(() => {
    const map = {};
    activities.forEach((a) => {
      if (!a.tanggal) return;
      if (!map[a.tanggal]) map[a.tanggal] = [];
      map[a.tanggal].push(a);
    });
    return map;
  }, [activities]);

  const yearOptions = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    activities.forEach((a) => {
      if (a.tanggal) years.add(Number(a.tanggal.split("-")[0]));
    });
    years.add(calendarYear);
    return Array.from(years).sort((a, b) => a - b);
  }, [activities, calendarYear]);

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddActivity(e) {
    e.preventDefault();
    setError("");

    if (!form.nama.trim()) {
      setError("Nama Kegiatan wajib diisi.");
      return;
    }
    if (!form.tanggal) {
      setError("Tanggal Kegiatan wajib diisi.");
      return;
    }
    if (!form.waktu) {
      setError("Waktu Kegiatan wajib diisi.");
      return;
    }
    if (!form.budget || parseThousands(form.budget) <= 0) {
      setError("Budget wajib diisi dengan angka yang valid.");
      return;
    }
    if (!form.pendanaan) {
      setError("Pendanaan wajib dipilih.");
      return;
    }

    const newActivity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nama: form.nama.trim(),
      tanggal: form.tanggal,
      waktu: form.waktu,
      budget: parseThousands(form.budget),
      fungsi: form.fungsi.trim(),
      pendanaan: form.pendanaan,
    };

    setActivities((prev) => sortActivities([...prev, newActivity]));
    setForm(emptyForm);

    const activityYear = Number(form.tanggal.split("-")[0]);
    setCalendarYear(activityYear);
  }

  function handleDeleteActivity(id) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  const isFormValid =
    form.nama.trim() !== "" &&
    form.tanggal !== "" &&
    form.waktu !== "" &&
    parseThousands(form.budget) > 0 &&
    form.pendanaan !== "";

  async function exportTablePDF() {
    if (!tableRef.current) return;

    const canvas = await html2canvas(tableRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
    const imgData = canvas.toDataURL("image/png");

    // A4 portrait in mm, with a small margin
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pdf.internal.pageSize.getHeight() - margin * 2;

    // Add extra pages if the table is taller than one page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight() - margin * 2;
    }

    const safeName = (departmentName || "Departement").replace(
      /[^a-z0-9]+/gi,
      "-",
    );
    pdf.save(`Rencana-Kegiatan-${safeName}.pdf`);
  }

  async function exportCalendarImage() {
    if (!calendarRef.current) return;
    const canvas = await html2canvas(calendarRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
    const link = document.createElement("a");
    const safeName = (departmentName || "Departement").replace(
      /[^a-z0-9]+/gi,
      "-",
    );
    link.download = `Kalender-Kegiatan-${safeName}-${calendarYear}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Perencana Kegiatan &amp; Anggaran</h1>
        <p>
          {activities.length} kegiatan &middot; Tahun kalender {calendarYear}
        </p>
      </header>

      <div className="app-container">
        {/* LEFT PANEL: INPUT */}
        <section className="panel left-panel">
          <h2 className="panel-title">INPUT</h2>

          <div className="field">
            <label htmlFor="departmentName">Nama Departement</label>
            <input
              id="departmentName"
              type="text"
              placeholder="Contoh: Departement Musik"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
            />
          </div>

          <hr className="divider" />

          <h3 className="section-title">Tambah Kegiatan</h3>
          <form className="activity-form" onSubmit={handleAddActivity}>
            <div className="field">
              <label htmlFor="nama">
                Nama Kegiatan <span className="required-mark">*</span>
              </label>
              <input
                id="nama"
                type="text"
                placeholder="Contoh: Ibadah Kemerdekaan"
                value={form.nama}
                onChange={(e) => handleFormChange("nama", e.target.value)}
                required
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="tanggal">
                  Tanggal Kegiatan <span className="required-mark">*</span>
                </label>
                <input
                  id="tanggal"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => handleFormChange("tanggal", e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="waktu">
                  Waktu Kegiatan <span className="required-mark">*</span>
                </label>
                <input
                  id="waktu"
                  type="time"
                  value={form.waktu}
                  onChange={(e) => handleFormChange("waktu", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="budget">
                  Budget (Rp) <span className="required-mark">*</span>
                </label>
                <input
                  id="budget"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.budget}
                  onChange={(e) =>
                    handleFormChange("budget", formatThousands(e.target.value))
                  }
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="pendanaan">
                  Pendanaan <span className="required-mark">*</span>
                </label>
                <select
                  id="pendanaan"
                  value={form.pendanaan}
                  onChange={(e) =>
                    handleFormChange("pendanaan", e.target.value)
                  }
                  required
                >
                  {PENDANAAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="fungsi">Fungsi Budget</label>
              <textarea
                id="fungsi"
                rows={3}
                placeholder="Jelaskan penggunaan budget..."
                value={form.fungsi}
                onChange={(e) => handleFormChange("fungsi", e.target.value)}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isFormValid}
            >
              + Tambah Kegiatan
            </button>
          </form>

          <hr className="divider" />

          <h3 className="section-title">
            Daftar Kegiatan ({activities.length})
          </h3>
          <div className="activity-list">
            {activities.length === 0 && (
              <p className="empty-hint">
                Belum ada kegiatan. Tambahkan kegiatan di atas.
              </p>
            )}
            {activities.map((a) => (
              <div key={a.id} className="activity-item">
                <div className="activity-info">
                  <strong>{a.nama}</strong>
                  <span>
                    {formatDateDisplay(a.tanggal)} &middot; {a.waktu}
                  </span>
                  <span>
                    {formatCurrency(a.budget)} &middot; {a.pendanaan}
                  </span>
                  {a.fungsi && <span className="fungsi-text">{a.fungsi}</span>}
                </div>
                <button
                  type="button"
                  className="btn-delete"
                  onClick={() => handleDeleteActivity(a.id)}
                  aria-label={`Hapus ${a.nama}`}
                  title="Hapus kegiatan"
                >
                  <img className="delete-icon" src={deleteLogo} alt="delete" />
                </button>
              </div>
            ))}
          </div>

          <div className="btn-reset-wrapper">
            <button
              type="button"
              className="btn btn-secondary btn-reset btn-red"
              onClick={() => {
                if (window.confirm("Hapus semua data tersimpan?")) {
                  localStorage.removeItem(STORAGE_KEY);
                  setDepartmentName("");
                  setActivities([]);
                  setCalendarYear(new Date().getFullYear());
                }
              }}
            >
              Reset Semua Data
            </button>
          </div>
        </section>

        {/* RIGHT PANEL: PREVIEW */}
        <section className="panel right-panel">
          <h2 className="panel-title">PREVIEW</h2>

          <div className="table-preview" ref={tableRef}>
            <h3 className="preview-heading">
              {departmentName || "Nama Departement"}
            </h3>
            <p className="preview-subheading">
              Rencana Kegiatan &amp; Anggaran
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Kegiatan</th>
                    <th>Tanggal</th>
                    <th>Waktu</th>
                    <th>Budget</th>
                    <th>Fungsi Budget</th>
                    <th>Pendanaan</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        Belum ada data kegiatan.
                      </td>
                    </tr>
                  ) : (
                    activities.map((a, i) => (
                      <tr key={a.id}>
                        <td>{i + 1}</td>
                        <td>{a.nama}</td>
                        <td>{formatDateDisplay(a.tanggal)}</td>
                        <td>{a.waktu}</td>
                        <td>{formatCurrency(a.budget)}</td>
                        <td>{a.fungsi || "-"}</td>
                        <td>{a.pendanaan}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>TOTAL</td>
                    <td>{formatCurrency(totalBudget)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="calendar-section">
            <div className="calendar-header">
              <h3 className="preview-heading">Kalender Kegiatan</h3>
              <select
                value={calendarYear}
                onChange={(e) => setCalendarYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="year-calendar" ref={calendarRef}>
              <div className="year-calendar-title">
                {departmentName ? `${departmentName} — ` : ""}Kalender Kegiatan{" "}
                {calendarYear}
              </div>
              <div className="months-grid-scroll">
                <div className="months-grid">
                  {MONTH_NAMES.map((monthName, monthIndex) => {
                    const daysInMonth = new Date(
                      calendarYear,
                      monthIndex + 1,
                      0,
                    ).getDate();
                    const firstWeekday = new Date(
                      calendarYear,
                      monthIndex,
                      1,
                    ).getDay();
                    const cells = [];
                    for (let i = 0; i < firstWeekday; i++) {
                      cells.push(
                        <div key={`empty-${i}`} className="mini-day empty" />,
                      );
                    }
                    for (let day = 1; day <= daysInMonth; day++) {
                      const iso = formatDateISOFromParts(
                        calendarYear,
                        monthIndex,
                        day,
                      );
                      const dayActivities = activitiesByDate[iso] || [];
                      const hasActivity = dayActivities.length > 0;
                      cells.push(
                        <div
                          key={iso}
                          className={`mini-day${hasActivity ? " has-activity" : ""}`}
                          title={
                            hasActivity
                              ? dayActivities.map((a) => a.nama).join(", ")
                              : undefined
                          }
                        >
                          {day}
                          {hasActivity && <span className="activity-dot" />}
                        </div>,
                      );
                    }
                    return (
                      <div className="mini-month" key={monthName}>
                        <div className="mini-month-title">{monthName}</div>
                        <div className="mini-month-grid">
                          {DAY_NAMES.map((d) => (
                            <div className="mini-day-name" key={d}>
                              {d}
                            </div>
                          ))}
                          {cells}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="legend">
                <span className="legend-dot" /> Ada Kegiatan
              </div>
            </div>
          </div>

          <div className="export-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportTablePDF}
            >
              Download Tabel Kegiatan (PDF)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportCalendarImage}
            >
              Download Kalender (Gambar)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
