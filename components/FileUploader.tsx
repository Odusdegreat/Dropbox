import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase"; // ✅ fixed path

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleUpload = () => {
    if (!file) {
      setMessage("⚠️ Please select a file first.");
      return;
    }

    setLoading(true);
    setMessage("");

    const storageRef = ref(storage, `uploads/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(prog));
      },
      (error) => {
        console.error(error);
        setMessage("❌ Failed to upload file.");
        setLoading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setMessage(`✅ File uploaded! URL: ${downloadURL}`);
          setLoading(false);
        });
      }
    );
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-900 text-white max-w-md">
      <label htmlFor="fileInput" className="block mb-2 text-sm font-medium">
        Select a file to upload:
      </label>
      <input
        id="fileInput"
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mb-4"
        title="Choose file"
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

      {progress > 0 && loading && (
        <p className="mt-2 text-sm">Uploading: {progress}%</p>
      )}

      {message && <p className="mt-3 text-green-400 break-words">{message}</p>}
    </div>
  );
}
