
"use client";

import { useState } from "react";
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
  const [openingReportId, setOpeningReportId] = useState<number | null>(null);

  function handleSelectReport(id: number) {
    setOpeningReportId(id);
    onSelectReport(id);
  }

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
          className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

        {reports.map((report) => {
          const isOpening = openingReportId === report.id;
          const isNavigating = openingReportId !== null;

          return (
            <button
              key={report.id}
              onClick={() => handleSelectReport(report.id)}
              disabled={isNavigating}
              className="flex w-full cursor-pointer flex-col gap-2 rounded-lg border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 sm:flex-row sm:items-center sm:justify-between"
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

              <div className="flex w-fit items-center gap-3">
                {isOpening && (
                  <span
                    className="flex items-center gap-2 text-xs font-medium text-blue-600"
                    role="status"
                  >
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                    Opening report...
                  </span>
                )}

                <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  {report.status}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
