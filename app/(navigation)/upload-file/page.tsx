import { UploadForm } from "@/components/upload-form";

export default function UploadFilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Upload</h1>
      <div>
        <UploadForm />
      </div>
    </div>
  );
}
