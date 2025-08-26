"use client";

import { useState } from "react";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

export default function FileManager() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFolder, setCurrentFolder] = useState("uploads");
  const [newFolderName, setNewFolderName] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  // Handle file upload
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const storageRef = ref(storage, `${currentFolder}/${file.name}`);
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
          console.log("✅ File available at:", url);
          setUploading(false);
          fetchFiles(currentFolder);
        });
      }
    );
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  // Browse
  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Create New Folder
  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const folderPath = `${currentFolder}/${newFolderName}/placeholder.txt`;

    // Create empty file so Firebase registers the folder
    const storageRef = ref(storage, folderPath);
    const blob = new Blob(["folder placeholder"], { type: "text/plain" });

    uploadBytesResumable(storageRef, blob).then(() => {
      console.log("📁 Folder created:", newFolderName);
      setNewFolderName("");
      fetchFiles(currentFolder);
    });
  };

  // Fetch files in current folder
  const fetchFiles = async (folder: string) => {
    const folderRef = ref(storage, folder);
    const result = await listAll(folderRef);
    setFiles(result.items.map((item) => item.name));
  };

  // Load initial files
  useState(() => {
    fetchFiles(currentFolder);
  });

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 border rounded-lg shadow-md">
      <h1 className="text-xl font-bold mb-4">📂 File Manager</h1>

      {/* Upload Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-500 p-6 text-center cursor-pointer rounded-lg mb-4"
      >
        <input
          type="file"
          id="fileInput"
          className="hidden"
          onChange={handleBrowse}
        />
        <label htmlFor="fileInput" className="block cursor-pointer">
          {uploading
            ? `Uploading... ${progress}%`
            : "Drag & drop your file here, or click to browse"}
        </label>
      </div>

      {/* New Folder */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder name"
          className="border p-2 rounded w-full"
        />
        <button
          onClick={createFolder}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          New Folder
        </button>
      </div>

      {/* File List */}
      <h2 className="font-semibold mb-2">Files in {currentFolder}:</h2>
      <ul className="list-disc pl-6">
        {files.length === 0 && <li className="text-gray-500">No files yet</li>}
        {files.map((file, i) => (
          <li key={i}>{file}</li>
        ))}
      </ul>
    </div>
  );
}
