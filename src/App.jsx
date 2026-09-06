import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

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

export default function App() {
  const [departmentName, setDepartmentName] = useState("");
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const tableRef = useRef(null);
  const calendarRef = useRef(null);

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
    if (
      form.budget === "" ||
      isNaN(Number(form.budget)) ||
      Number(form.budget) < 0
    ) {
      setError("Budget wajib diisi dengan angka yang valid.");
      return;
    }

    const newActivity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nama: form.nama.trim(),
      tanggal: form.tanggal,
      waktu: form.waktu,
      budget: Number(form.budget),
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

  function exportExcel() {
    const aoa = [];
    aoa.push(["Nama Departement:", departmentName || "-"]);
    aoa.push([]);
    aoa.push([
      "No",
      "Nama Kegiatan",
      "Tanggal Kegiatan",
      "Waktu Kegiatan",
      "Budget",
      "Fungsi Budget",
      "Pendanaan",
    ]);
    activities.forEach((a, i) => {
      aoa.push([
        i + 1,
        a.nama,
        formatDateDisplay(a.tanggal),
        a.waktu,
        a.budget,
        a.fungsi,
        a.pendanaan,
      ]);
    });
    aoa.push([]);
    aoa.push(["", "", "", "", "Total Budget", totalBudget, ""]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 35 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rencana Kegiatan");

    const safeName = (departmentName || "Departement").replace(
      /[^a-z0-9]+/gi,
      "-",
    );
    XLSX.writeFile(wb, `Rencana-Kegiatan-${safeName}.xlsx`);
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
              <label htmlFor="nama">Nama Kegiatan</label>
              <input
                id="nama"
                type="text"
                placeholder="Contoh: Latihan Paduan Suara"
                value={form.nama}
                onChange={(e) => handleFormChange("nama", e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="tanggal">Tanggal Kegiatan</label>
                <input
                  id="tanggal"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => handleFormChange("tanggal", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="waktu">Waktu Kegiatan</label>
                <input
                  id="waktu"
                  type="time"
                  value={form.waktu}
                  onChange={(e) => handleFormChange("waktu", e.target.value)}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="budget">Budget (Rp)</label>
                <input
                  id="budget"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.budget}
                  onChange={(e) => handleFormChange("budget", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="pendanaan">Pendanaan</label>
                <select
                  id="pendanaan"
                  value={form.pendanaan}
                  onChange={(e) =>
                    handleFormChange("pendanaan", e.target.value)
                  }
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

            <button type="submit" className="btn btn-primary">
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
                  &times;
                </button>
              </div>
            ))}
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
              onClick={exportExcel}
            >
              Download Tabel Kegiatan (Excel)
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
