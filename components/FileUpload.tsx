"use client";

import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function FileUpload({
  onUploadComplete,
}: {
  onUploadComplete: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const storageRef = ref(storage, `uploads/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploading(true);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(percent));
      },
      (error) => {
        console.error(error);
        setUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          console.log("✅ File uploaded at:", url);
          setUploading(false);
          onUploadComplete();
        });
      }
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-gray-500 p-6 text-center cursor-pointer rounded-lg space-y-3"
    >
      {/* Hidden input */}
      <input
        type="file"
        id="fileInput"
        className="hidden"
        onChange={handleBrowse}
      />

      {/* Browse button using shadcn */}
      <Button asChild variant="outline">
        <label htmlFor="fileInput" className="cursor-pointer">
          {uploading ? `Uploading... ${progress}%` : "Browse File"}
        </label>
      </Button>

      <p className="text-sm text-gray-500">Or drag & drop your file here</p>

      {uploading && (
        <p className="mt-2 text-sm text-blue-500">Progress: {progress}%</p>
      )}
    </div>
  );
