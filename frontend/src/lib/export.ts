/**
 * Table exports built in the browser: CSV (opens in Excel / Sheets) and PDF (a printable table).
 * The PDF library is loaded only when someone actually exports, so it never weighs on page loads.
 */

export type ExportFormat = "csv" | "pdf";

export type ExportColumn<T> = { id: string; label: string; value: (row: T) => string | number };

export type ExportTable<T> = {
  /** Shown as the PDF heading. */
  title: string;
  /** A line under the heading: what was exported and when. */
  subtitle: string;
  columns: ExportColumn<T>[];
  rows: T[];
  /** Without extension. */
  fileName: string;
};

/** One table cell as text. */
export const cellText = <T,>(column: ExportColumn<T>, row: T) => String(column.value(row) ?? "");

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv<T>({ columns, rows }: Pick<ExportTable<T>, "columns" | "rows">): string {
  const lines = [columns.map((c) => csvEscape(c.label)).join(","), ...rows.map((row) => columns.map((c) => csvEscape(cellText(c, row))).join(","))];
  return lines.join("\r\n");
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function toPdf<T>(table: ExportTable<T>): Promise<Blob> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.autoTable ?? autoTableModule.default;

  // Landscape once there are many columns.
  const doc = new jsPDF({ orientation: table.columns.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const margin = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(table.title, margin, margin + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(table.subtitle, margin, margin + 22);

  autoTable(doc, {
    startY: margin + 36,
    margin: { left: margin, right: margin },
    head: [table.columns.map((c) => c.label)],
    body: table.rows.map((row) => table.columns.map((c) => cellText(c, row))),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${page}`, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - 16, { align: "right" });
    },
  });

  return doc.output("blob");
}

/** Builds the file and starts the download. */
export async function exportTable<T>(table: ExportTable<T>, format: ExportFormat): Promise<void> {
  if (format === "csv") {
    // The byte-order mark makes Excel read the file as UTF-8 (names, "–", "৳" stay intact).
    download(new Blob(["﻿", toCsv(table)], { type: "text/csv;charset=utf-8" }), `${table.fileName}.csv`);
    return;
  }
  download(await toPdf(table), `${table.fileName}.pdf`);
}
