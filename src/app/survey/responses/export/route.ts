import { readResponses } from "@/lib/store";

// Spreadsheet apps run cells that start with these characters as formulas.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string) {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET() {
  const responses = await readResponses();

  // One column per distinct question label, in order of first appearance. Oldest reports first.
  const ordered = [...responses].reverse();
  const labels: string[] = [];
  for (const r of ordered) for (const a of r.answers) if (!labels.includes(a.label)) labels.push(a.label);

  const rows = [
    ["Received", "Event", "From", ...labels],
    ...ordered.map((r) => [
      r.submittedAt,
      r.eventName,
      r.submittedBy,
      ...labels.map((l) => r.answers.find((a) => a.label === l)?.value ?? ""),
    ]),
  ];
  // BOM so Excel reads the file as UTF-8.
  const csv = "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pit-repair-reports-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
