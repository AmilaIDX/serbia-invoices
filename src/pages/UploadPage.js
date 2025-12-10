import FileUploader from "../components/FileUploader";

const UploadPage = () => {
  return (
    <div className="grid">
      <h1 className="page-title">Upload</h1>
      <p className="muted">Get a pre-signed URL for uploading documents to storage.</p>
      <FileUploader />
    </div>
  );
};

export default UploadPage;
