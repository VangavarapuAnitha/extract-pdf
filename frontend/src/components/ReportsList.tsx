
"use client";

import { Report } from "@/types/report";

interface ReportsListProps {
  reports: Report[];
  loading: boolean;
  onRefresh: () => void;
  onSelectReport: (id: number) => void;
}

export default function ReportsList({
  reports,
  loading,
  onRefresh,
  onSelectReport,
}: ReportsListProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Completed Reports
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a report to view its extracted data.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {loading && reports.length === 0 && (
          <p className="text-sm text-slate-500">
            Loading reports...
          </p>
        )}

        {!loading && reports.length === 0 && (
          <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
            No completed reports found. Upload a PDF to get started.
          </p>
        )}

        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => onSelectReport(report.id)}
            className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">
                {report.originalFilename}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Report ID: {report.reportId ?? "Not available"}
                {" | "}
                Sample ID: {report.sampleId ?? "Not available"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Uploaded: {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>

            <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              {report.status}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
