"use client";

import { useEffect, useState } from "react";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";

export default function FileList() {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);

  const fetchFiles = async () => {
    const listRef = ref(storage, "uploads");
    const res = await listAll(listRef);
    const urls = await Promise.all(
      res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return { name: itemRef.name, url };
      })
    );
    setFiles(urls);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {files.map((file) => (
        <Card key={file.name} className="p-2">
          <CardContent>
            <p className="font-medium">{file.name}</p>
            <a
              href={file.url}
              target="_blank"
              className="text-blue-500 text-sm"
            >
              View / Download
            </a>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
