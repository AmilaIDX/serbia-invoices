import { useState } from "react";
import { uploadFile } from "../services/api";

const FileUploader = () => {
  const [file, setFile] = useState(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [status, setStatus] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    setStatus("Requesting upload URL...");
    try {
      const { uploadUrl: url } = await uploadFile(file);
      setUploadUrl(url);
      setStatus("Upload URL ready. Use it to send your file.");
    } catch (err) {
      setStatus(err.message || "Failed to get upload URL");
    }
  };

  return (
    <div className="card grid">
      <div className="form-control">
        <label>Select file</label>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      <button className="btn" onClick={handleUpload} disabled={!file}>
        Get Upload URL
      </button>
      {status && <div className="muted">{status}</div>}
      {uploadUrl && (
        <div className="form-control">
          <label>Upload URL</label>
          <input value={uploadUrl} readOnly />
        </div>
      )}
    </div>
  );
};

export default FileUploader;
