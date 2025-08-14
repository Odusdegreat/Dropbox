"use client";

import { useState } from "react";

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const data = await res.json();
      setMessage(data.message || "Upload complete ✅");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to upload file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-900 text-white max-w-md">
      <label
        htmlFor="file-upload"
        className="block mb-2 text-sm font-medium text-gray-300"
      >
        Choose a file
      </label>
      <input
        id="file-upload"
        type="file"
        title="Select a file to upload"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className={`px-4 py-2 rounded ${
          loading
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
      {message && <p className="mt-3 text-green-400">{message}</p>}
    </div>
  );
}
