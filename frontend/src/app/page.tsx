
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import UploadReport from "@/components/UploadReport";
import ReportsList from "@/components/ReportsList";
import { Report } from "@/types/report";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/reports`);

      if (!response.ok) {
        throw new Error("Unable to fetch reports");
      }

      const data = await response.json();
      setReports(data.reports);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  function handleSelectReport(id: number) {
    router.push(`/reports/${id}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            Extract PDF
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Upload laboratory reports and view extracted parameters.
          </p>
        </header>

        <UploadReport onUploadSuccess={fetchReports} />

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <ReportsList
          reports={reports}
          loading={loadingReports}
          onRefresh={fetchReports}
          onSelectReport={handleSelectReport}
        />

        <footer className="pb-4 text-center text-xs text-slate-400">
          Extract PDF — Laboratory Report Data Extraction
        </footer>

      </div>
    </main>
  );
}
