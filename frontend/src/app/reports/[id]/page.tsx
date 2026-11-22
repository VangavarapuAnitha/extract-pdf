
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import ReportDetails from "@/components/ReportDetails";
import {
  ReportDetails as ReportDetailsType,
} from "@/types/report";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [report, setReport] = useState<ReportDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/reports/${id}`);

        if (!response.ok) {
          throw new Error("Unable to fetch report details");
        }

        const data = await response.json();

        setReport({
          ...data.report,
          parameters: data.parameters,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchReport();
  }, [id]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            Extract PDF
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Laboratory Report Details
          </p>
        </header>

        {loading && (
          <p className="rounded-lg bg-white p-6 text-sm text-slate-500">
            Loading report details...
          </p>
        )}

        {error && (
          <section className="rounded-xl border border-red-200 bg-white p-6">
            <p className="text-sm text-red-700">{error}</p>

            <button
              onClick={() => router.push("/")}
              className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Back to Reports
            </button>
          </section>
        )}

        {!loading && report && (
          <ReportDetails
            report={report}
            onBack={() => router.push("/")}
          />
        )}

        <footer className="pb-4 text-center text-xs text-slate-400">
          Extract PDF — Laboratory Report Data Extraction
        </footer>

      </div>
    </main>
  );
}
