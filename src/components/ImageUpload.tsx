import { useCallback, useState } from "react";
import { Upload, FileImage, FileText } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (file: File) => void | Promise<void>;
  onPdfSelect?: (file: File) => void | Promise<void>;
  isProcessing: boolean;
  uploadLabel?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const ImageUpload = ({
  onImageSelect,
  onPdfSelect,
  isProcessing,
  uploadLabel = "Încarcă fotografia talonului",
}: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) return;

      if (file.type === "application/pdf") {
        setIsPdf(true);
        setPreview(null);
        try {
          await onPdfSelect?.(file);
        } catch {
          // errors handled upstream
        }
        return;
      }

      setIsPdf(false);
      const url = URL.createObjectURL(file);
      setPreview(url);
      try {
        await onImageSelect(file);
      } catch {
        // errors handled upstream
      }
    },
    [onImageSelect, onPdfSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="w-full">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex flex-col items-center justify-center w-full min-h-[280px] rounded-xl cursor-pointer
          border-2 border-dashed transition-all duration-300
          ${isDragging
            ? "border-primary bg-primary/5 scanner-glow"
            : "border-border hover:border-primary/50 hover:bg-secondary/30"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {preview ? (
          <div className="relative w-full h-full p-4">
            <img
              src={preview}
              alt="Document preview"
              className="w-full max-h-[300px] object-contain rounded-lg"
            />
            {isProcessing && (
              <div className="absolute inset-4 rounded-lg overflow-hidden">
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
              </div>
            )}
          </div>
        ) : isPdf && isProcessing ? (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="p-4 rounded-2xl bg-secondary">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <p className="text-foreground font-medium">Se procesează PDF-ul...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="p-4 rounded-2xl bg-secondary scanner-border">
              {isDragging ? (
                <FileImage className="w-10 h-10 text-primary" />
              ) : (
                <Upload className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium text-lg">
                {uploadLabel}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Trage fișierul aici sau apasă pentru a selecta
              </p>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-1 rounded bg-secondary">JPG</span>
              <span className="px-2 py-1 rounded bg-secondary">PNG</span>
              <span className="px-2 py-1 rounded bg-secondary">WEBP</span>
              <span className="px-2 py-1 rounded bg-secondary">PDF</span>
            </div>
          </div>
        )}
      </label>
    </div>
  );
};

export default ImageUpload;
