import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import deleteLogo from "../src/public/assets/delete.webp";
import plusLogo from "../src/public/assets/plus.webp";

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
const KENDALA_KATEGORI_OPTIONS = [
  "Internal",
  "External",
  "Keuangan",
  "Fasilitas",
  "Lainnya",
];
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

function activityTotal(activity) {
  return (activity.budgetItems || []).reduce(
    (sum, b) => sum + (Number(b.amount) || 0),
    0,
  );
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Gagal menyimpan data:", e);
  }
}

function addImageToPdf(pdf, canvas, margin, format, orientation) {
  const imgData = canvas.toDataURL("image/png");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage(format, orientation);
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }
}

const emptyForm = {
  nama: "",
  tanggal: "",
  waktu: "",
  pendanaan: PENDANAAN_OPTIONS[0],
  budgetItems: [],
};
const emptyBudgetDraft = { amount: "", fungsi: "" };
const emptyKendalaDraft = { kategori: KENDALA_KATEGORI_OPTIONS[0], text: "" };

export default function App() {
  const [departmentName, setDepartmentName] = useState("");
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [budgetDraft, setBudgetDraft] = useState(emptyBudgetDraft);
  const [error, setError] = useState("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [reviewYear, setReviewYear] = useState(new Date().getFullYear());
  const [reviews, setReviews] = useState([]);
  const [reviewDraft, setReviewDraft] = useState("");
  const [kendalas, setKendalas] = useState([]);
  const [kendalaDraft, setKendalaDraft] = useState(emptyKendalaDraft);

  const tableRef = useRef(null);
  const calendarRef = useRef(null);
  const reviewKendalaRef = useRef(null);

  // Load saved data once, on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);
      if (saved.departmentName) setDepartmentName(saved.departmentName);
      if (saved.activities) setActivities(saved.activities);
      if (saved.calendarYear) setCalendarYear(saved.calendarYear);
      if (saved.reviews) setReviews(saved.reviews);
      if (saved.kendalas) setKendalas(saved.kendalas);
      if (saved.reviewYear) setReviewYear(saved.reviewYear);
    } catch (e) {
      console.warn("Gagal membaca data tersimpan:", e);
    }
  }, []);

  function persist(overrides = {}) {
    saveToStorage({
      departmentName,
      activities,
      calendarYear,
      reviews,
      kendalas,
      reviewYear,
      ...overrides,
    });
  }

  const totalBudget = useMemo(
    () => activities?.reduce((sum, a) => sum + activityTotal(a), 0),
    [activities],
  );

  const activitiesByDate = useMemo(() => {
    const map = {};
    activities?.forEach((a) => {
      if (!a.tanggal) return;
      if (!map[a.tanggal]) map[a.tanggal] = [];
      map[a.tanggal].push(a);
    });
    return map;
  }, [activities]);

  const yearOptions = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    activities?.forEach((a) => {
      if (a.tanggal) years.add(Number(a.tanggal.split("-")[0]));
    });
    years.add(calendarYear);
    return Array.from(years).sort((a, b) => a - b);
  }, [activities, calendarYear]);

  const reviewYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear, currentYear - 1]);
    reviews.forEach((r) => years.add(r.year));
    kendalas.forEach((k) => years.add(k.year));
    years.add(reviewYear);
    return Array.from(years).sort((a, b) => a - b);
  }, [reviews, kendalas, reviewYear]);

  const currentReviews = useMemo(
    () => reviews.filter((r) => r.year === reviewYear),
    [reviews, reviewYear],
  );
  const currentKendalas = useMemo(
    () => kendalas.filter((k) => k.year === reviewYear),
    [kendalas, reviewYear],
  );

  const isBudgetDraftValid =
    parseThousands(budgetDraft.amount) > 0 && budgetDraft.fungsi.trim() !== "";

  const isFormValid =
    form.nama.trim() !== "" &&
    form.tanggal !== "" &&
    form.waktu !== "" &&
    form.pendanaan !== "" &&
    form.budgetItems.length > 0;

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddBudgetItem(e) {
    e.preventDefault();
    if (!isBudgetDraftValid) return;
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      amount: parseThousands(budgetDraft.amount),
      fungsi: budgetDraft.fungsi.trim(),
    };
    setForm((prev) => ({ ...prev, budgetItems: [...prev.budgetItems, item] }));
    setBudgetDraft(emptyBudgetDraft);
  }

  function handleRemoveBudgetItem(id) {
    setForm((prev) => ({
      ...prev,
      budgetItems: prev.budgetItems.filter((b) => b.id !== id),
    }));
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
    if (!form.pendanaan) {
      setError("Pendanaan wajib dipilih.");
      return;
    }
    if (form.budgetItems.length === 0) {
      setError("Tambahkan minimal 1 detail budget.");
      return;
    }

    const newActivity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nama: form.nama.trim(),
      tanggal: form.tanggal,
      waktu: form.waktu,
      pendanaan: form.pendanaan,
      budgetItems: form.budgetItems,
    };

    const updatedActivities = sortActivities([...activities, newActivity]);
    const activityYear = Number(form.tanggal.split("-")[0]);

    setActivities(updatedActivities);
    setForm(emptyForm);
    setBudgetDraft(emptyBudgetDraft);
    setCalendarYear(activityYear);

    persist({ activities: updatedActivities, calendarYear: activityYear });
  }

  function handleDeleteActivity(id) {
    const updatedActivities = activities?.filter((a) => a.id !== id);
    setActivities(updatedActivities);
    persist({ activities: updatedActivities });
  }

  function handleAddReview(e) {
    e.preventDefault();
    if (!reviewDraft.trim()) return;
    const newReview = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      year: reviewYear,
      text: reviewDraft.trim(),
    };
    const updated = [...reviews, newReview];
    setReviews(updated);
    setReviewDraft("");
    persist({ reviews: updated });
  }

  function handleDeleteReview(id) {
    const updated = reviews.filter((r) => r.id !== id);
    setReviews(updated);
    persist({ reviews: updated });
  }

  function handleAddKendala(e) {
    e.preventDefault();
    if (!kendalaDraft.text.trim()) return;
    const newKendala = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      year: reviewYear,
      kategori: kendalaDraft.kategori,
      text: kendalaDraft.text.trim(),
    };
    const updated = [...kendalas, newKendala];
    setKendalas(updated);
    setKendalaDraft(emptyKendalaDraft);
    persist({ kendalas: updated });
  }

  function handleDeleteKendala(id) {
    const updated = kendalas.filter((k) => k.id !== id);
    setKendalas(updated);
    persist({ kendalas: updated });
  }

  async function exportFullPDF() {
    if (!reviewKendalaRef.current || !tableRef.current) return;

    const reviewCanvas = await html2canvas(reviewKendalaRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
    const tableCanvas = await html2canvas(tableRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    addImageToPdf(pdf, reviewCanvas, 10, "a4", "portrait");

    pdf.addPage("a4", "landscape");
    addImageToPdf(pdf, tableCanvas, 10, "a4", "landscape");

    const safeName = (departmentName || "Departement").replace(
      /[^a-z0-9]+/gi,
      "-",
    );
    pdf.save(`Laporan-Kegiatan-${safeName}.pdf`);
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
          {activities?.length || 0} kegiatan &middot; Tahun kalender{" "}
          {calendarYear}
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

          {/* REVIEW & KENDALA SECTION */}
          <h3 className="section-title">Review &amp; Kendala Tahunan</h3>

          <div className="field">
            <label htmlFor="reviewYear">Tahun</label>
            <select
              id="reviewYear"
              value={reviewYear}
              onChange={(e) => setReviewYear(Number(e.target.value))}
            >
              {reviewYearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <h4 className="subsection-title">
            Review (Pencapaian / Keberhasilan)
          </h4>
          <form className="inline-form" onSubmit={handleAddReview}>
            <div className="field">
              <label htmlFor="reviewDraft">Pencapaian atau Keberhasilan</label>
              <textarea
                id="reviewDraft"
                rows={2}
                placeholder="Tuliskan pencapaian atau keberhasilan..."
                value={reviewDraft}
                onChange={(e) => setReviewDraft(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!reviewDraft.trim()}
            >
              + Tambah Review
            </button>
          </form>

          {currentReviews?.length > 0 && (
            <div className="activity-list">
              {currentReviews.map((r) => (
                <div key={r.id} className="activity-item">
                  <div className="activity-info">
                    <span>{r.text}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => handleDeleteReview(r.id)}
                    aria-label="Hapus review"
                    title="Hapus review"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <h4 className="subsection-title">Kendala</h4>
          <form className="inline-form" onSubmit={handleAddKendala}>
            <div className="field">
              <label htmlFor="kendalaKategori">Kategori Kendala</label>
              <select
                id="kendalaKategori"
                value={kendalaDraft.kategori}
                onChange={(e) =>
                  setKendalaDraft((prev) => ({
                    ...prev,
                    kategori: e.target.value,
                  }))
                }
              >
                {KENDALA_KATEGORI_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="kendalaText">Masalah atau Problem</label>
              <textarea
                id="kendalaText"
                rows={2}
                placeholder="Jelaskan masalah atau kendala..."
                value={kendalaDraft.text}
                onChange={(e) =>
                  setKendalaDraft((prev) => ({ ...prev, text: e.target.value }))
                }
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!kendalaDraft.text.trim()}
            >
              + Tambah Kendala
            </button>
          </form>

          {currentKendalas?.length > 0 && (
            <div className="activity-list">
              {currentKendalas.map((k) => (
                <div key={k.id} className="activity-item">
                  <div className="activity-info">
                    <strong>{k.kategori}</strong>
                    <span>{k.text}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => handleDeleteKendala(k.id)}
                    aria-label="Hapus kendala"
                    title="Hapus kendala"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <hr className="divider" />

          {/* ACTIVITY FORM */}
          <h3 className="section-title">Tambah Kegiatan</h3>
          <form className="activity-form" onSubmit={handleAddActivity}>
            <div className="field">
              <label htmlFor="nama">
                Nama Kegiatan <span className="required-mark">*</span>
              </label>
              <input
                id="nama"
                type="text"
                placeholder="Contoh: Latihan Paduan Suara"
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

            <div className="field">
              <label htmlFor="pendanaan">
                Pendanaan <span className="required-mark">*</span>
              </label>
              <select
                id="pendanaan"
                value={form.pendanaan}
                onChange={(e) => handleFormChange("pendanaan", e.target.value)}
                required
              >
                {PENDANAAN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* DETAIL BUDGET */}
            <div className="field">
              <label>
                Detail Budget <span className="required-mark">*</span>
              </label>

              <div className="field-row budget-input-row">
                <div className="field">
                  <label htmlFor="budgetAmount">Jumlah Budget (Rp)</label>
                  <input
                    id="budgetAmount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={budgetDraft.amount}
                    onChange={(e) =>
                      setBudgetDraft((prev) => ({
                        ...prev,
                        amount: formatThousands(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="budgetFungsi">Fungsi Budget</label>
                  <textarea
                    id="budgetFungsi"
                    rows={2}
                    placeholder="Jelaskan penggunaan budget ini..."
                    value={budgetDraft.fungsi}
                    onChange={(e) =>
                      setBudgetDraft((prev) => ({
                        ...prev,
                        fungsi: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <button
                    type="button"
                    className="btn-icon-add"
                    onClick={handleAddBudgetItem}
                    disabled={!isBudgetDraftValid}
                    aria-label="Tambah detail budget"
                    title="Tambah detail budget"
                  >
                    <img className="add-icon" src={plusLogo} alt="tambah" />
                  </button>
                </div>
              </div>

              {form.budgetItems.length > 0 && (
                <div className="activity-list budget-item-list">
                  {form.budgetItems.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className="activity-info">
                        <strong>{formatCurrency(item.amount)}</strong>
                        <span>{item.fungsi}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleRemoveBudgetItem(item.id)}
                        aria-label="Hapus detail budget"
                        title="Hapus detail budget"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <div className="budget-item-total">
                    Total Budget Kegiatan Ini:{" "}
                    {formatCurrency(
                      form.budgetItems.reduce((s, b) => s + b.amount, 0),
                    )}
                  </div>
                </div>
              )}
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
            Daftar Kegiatan ({activities?.length || 0})
          </h3>
          <div className="activity-list">
            {activities?.length === 0 && (
              <p className="empty-hint">
                Belum ada kegiatan. Tambahkan kegiatan di atas.
              </p>
            )}
            {activities?.map((a) => (
              <div key={a.id} className="activity-item">
                <div className="activity-info">
                  <strong>{a.nama}</strong>
                  <span>
                    {formatDateDisplay(a.tanggal)} &middot; {a.waktu}
                  </span>
                  <span>
                    {formatCurrency(activityTotal(a))} (
                    {a.budgetItems?.length || 0} item budget) &middot;{" "}
                    {a.pendanaan}
                  </span>
                  <span className="fungsi-text">
                    {a.budgetItems?.map((b) => b.fungsi).join("; ")}
                  </span>
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

          {/* PAGE 1: REVIEW & KENDALA */}
          <div className="table-preview" ref={reviewKendalaRef}>
            <h3 className="preview-heading">
              {departmentName || "Nama Departement"}
            </h3>
            <p className="preview-subheading">Review &amp; Kendala Tahunan</p>

            <div className="review-kendala-block">
              <h4>Review {reviewYear}</h4>
              <ol>
                {currentReviews?.length === 0 ? (
                  <li className="empty-cell">Belum ada review.</li>
                ) : (
                  currentReviews?.map((r) => <li key={r.id}>{r.text}</li>)
                )}
              </ol>

              <h4>Kendala {reviewYear}</h4>
              <ol>
                {currentKendalas?.length === 0 ? (
                  <li className="empty-cell">Belum ada kendala.</li>
                ) : (
                  currentKendalas?.map((k) => (
                    <li key={k.id}>
                      ({k.kategori}) {k.text}
                    </li>
                  ))
                )}
              </ol>
            </div>
          </div>

          {/* PAGE 2: KEGIATAN TABLE */}
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
                    <th>Detail Budget &amp; Fungsi</th>
                    <th>Total Budget</th>
                    <th>Pendanaan</th>
                  </tr>
                </thead>
                <tbody>
                  {activities?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        Belum ada data kegiatan.
                      </td>
                    </tr>
                  ) : (
                    activities?.map((a, i) => (
                      <tr key={a.id}>
                        <td>{i + 1}</td>
                        <td>{a.nama}</td>
                        <td>{formatDateDisplay(a.tanggal)}</td>
                        <td>{a.waktu}</td>
                        <td>
                          {a.budgetItems?.map((b) => (
                            <div key={b.id}>
                              {formatCurrency(b.amount)} - {b.fungsi}
                            </div>
                          ))}
                        </td>
                        <td>{formatCurrency(activityTotal(a))}</td>
                        <td>{a.pendanaan}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>TOTAL</td>
                    <td>{formatCurrency(totalBudget)}</td>
                    <td></td>
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
                  {MONTH_NAMES?.map((monthName, monthIndex) => {
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
                      const hasActivity = dayActivities?.length > 0;
                      cells.push(
                        <div
                          key={iso}
                          className={`mini-day${hasActivity ? " has-activity" : ""}`}
                          title={
                            hasActivity
                              ? dayActivities?.map((a) => a.nama).join(", ")
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
              onClick={exportFullPDF}
            >
              Download Laporan (PDF)
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
