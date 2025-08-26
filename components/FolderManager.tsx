"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function FolderManager() {
  const [folderName, setFolderName] = useState("");

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    // In Firebase, folder = just prefix path
    console.log(`📁 Created folder: uploads/${folderName}/`);
    setFolderName("");
  };

  return (
    <div className="flex gap-2 mt-4">
      <Input
        placeholder="Enter folder name"
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
      />
      <Button onClick={handleCreateFolder}>New Folder</Button>
    </div>
  );
}
