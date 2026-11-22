
"use client";

import { ReportDetails as ReportDetailsType } from "@/types/report";

interface ReportDetailsProps {
  report: ReportDetailsType;
  onBack: () => void;
}

export default function ReportDetails({
  report,
  onBack,
}: ReportDetailsProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <button
        onClick={onBack}
        className="mb-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
      >
        ← Back to Reports
      </button>

      <h2 className="text-xl font-semibold">
        Report Details
      </h2>

      <div className="mt-5 grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Report ID</p>
          <p className="mt-1 font-semibold">
            {report.reportId ?? "Not available"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Sample ID</p>
          <p className="mt-1 font-semibold">
            {report.sampleId ?? "Not available"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">PDF Filename</p>
          <p className="mt-1 break-all font-medium">
            {report.originalFilename}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Uploaded On</p>
          <p className="mt-1 font-medium">
            {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <h3 className="mt-6 font-semibold">
        Extracted Parameters
      </h3>

      {report.parameters.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No parameters available.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[650px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-600">
                <th className="px-4 py-3 font-semibold">Parameter</th>
                <th className="px-4 py-3 font-semibold">Result</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Reference Range</th>
              </tr>
            </thead>

            <tbody>
              {report.parameters.map((parameter) => (
                <tr
                  key={parameter.id}
                  className="border-b last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium">
                    {parameter.parameterName}
                  </td>

                  <td className="px-4 py-3">
                    {parameter.value}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {parameter.unit ?? "—"}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {parameter.referenceRange ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
