
"use client";

import { useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UploadReportProps {
  onUploadSuccess: () => void;
}

export default function UploadReport({
  onUploadSuccess,
}: UploadReportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!selectedFile) {
      setError("Please select a PDF file");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_URL}/reports/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "PDF upload failed");
      }

      setSuccess("PDF uploaded and processed successfully!");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onUploadSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Upload PDF Report</h2>

      <p className="mt-1 text-sm text-slate-500">
        Select a laboratory report in PDF format (maximum 10 MB).
      </p>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] ?? null);
            setError("");
            setSuccess("");
          }}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </div>

      {selectedFile && (
        <p className="mt-3 text-sm text-slate-600">
          Selected: {selectedFile.name}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}
    </section>
  );
}
