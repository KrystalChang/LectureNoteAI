"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  // const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const route = useRouter();

  async function handleUpload() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      route.push(`/documents/${data.documentId}`);
    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main>
      <h1>Upload PDF</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setError("");
        }}
      />

      <button onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}
