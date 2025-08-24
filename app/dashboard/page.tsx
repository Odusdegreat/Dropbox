"use client";

import { useState, useRef, useEffect } from "react";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

interface UploadedFile {
  name: string;
  url?: string;
  isFolder?: boolean;
}

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addImageInputRef = useRef<HTMLInputElement | null>(null);
  const browseInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch files from Firebase storage
  const fetchFiles = async () => {
    const storageRef = ref(storage, "uploads/");
    const res = await listAll(storageRef);

    const fetchedFiles: UploadedFile[] = await Promise.all(
      res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return { name: itemRef.name, url };
      })
    );

    const folders: UploadedFile[] = res.prefixes.map((folderRef) => ({
      name: folderRef.name,
      isFolder: true,
    }));

    setFiles([...folders, ...fetchedFiles]);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Handle uploads
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
          console.log("✅ File available at:", url);
          setUploading(false);
          fetchFiles(); // refresh list
        });
      }
    );
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // New Folder
  const handleNewFolder = () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    const folderRef = ref(storage, `uploads/${folderName}/.keep`);
    const emptyFile = new Blob([], { type: "text/plain" });

    uploadBytesResumable(folderRef, emptyFile).then(() => {
      console.log(`📁 Folder '${folderName}' created`);
      fetchFiles();
    });
  };

  return (
    <div className="space-y-6">
      {/* Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleNewFolder}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          ➕ New Folder
        </button>

        <button
          onClick={() => addImageInputRef.current?.click()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          🖼️ Add Image
        </button>

        <button
          onClick={() => browseInputRef.current?.click()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg"
        >
          📂 Browse Files
        </button>
      </div>

      {/* Hidden Inputs */}
      <input
        ref={addImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAddImage}
        aria-label="Add image file"
      />
      <input
        ref={browseInputRef}
        type="file"
        className="hidden"
        onChange={handleBrowse}
        aria-label="Browse file"
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-500 p-6 text-center cursor-pointer rounded-lg"
      >
        {uploading
          ? `Uploading... ${progress}%`
          : "📂 Drag & drop your file here, or click Browse"}
      </div>

      {/* File List */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Uploaded Files & Folders</h3>
        {files.length === 0 ? (
          <p className="text-gray-500">No files uploaded yet</p>
        ) : (
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between border-b pb-2"
              >
                <span>
                  {file.isFolder ? "📁" : "📄"} {file.name}
                </span>
                {!file.isFolder && file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Open
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
