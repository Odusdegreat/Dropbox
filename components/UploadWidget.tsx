// components/UploadWidget.tsx
"use client";

import { useRef, useState } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function UploadWidget() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAddImageClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too big (5MB max)");
      return;
    }

    const storageRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploading(true);

    uploadTask.on(
      "state_changed",
      null,
      (error) => {
        setUploading(false);
        alert("Upload failed: " + error.message);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setUploading(false);
        alert("Upload successful!");
        console.log("Image URL:", downloadURL);
        // You can now save this URL to your database or show a preview
      }
    );
  };

  return (
    <div className="bg-[#111] text-white p-4 rounded-md">
      <div className="flex gap-2 mb-4">
        <button
          className="bg-blue-600 px-3 py-2 rounded"
          onClick={handleAddImageClick}
        >
          {uploading ? "Uploading..." : "Add Image"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          title="Select an image to upload"
        />
      </div>
    </div>
  );
}
