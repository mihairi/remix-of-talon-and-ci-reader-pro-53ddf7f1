import { useState, useCallback } from "react";
import { createWorker } from "tesseract.js";
import ImageUpload from "@/components/ImageUpload";
import DocumentResults from "@/components/DocumentResults";
import { parseDocumentText, type ParsedDocument } from "@/lib/documentParser";
import { ScanLine, RotateCcw, FileText } from "lucide-react";

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ParsedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const worker = await createWorker("ron", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const imageUrl = URL.createObjectURL(file);
      const { data } = await worker.recognize(imageUrl);
      URL.revokeObjectURL(imageUrl);

      await worker.terminate();

      const parsed = parseDocumentText(data.text);
      setResult(parsed);
    } catch (err) {
      console.error("OCR Error:", err);
      setError("Eroare la procesarea imaginii. Încearcă din nou.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 scanner-border">
              <ScanLine className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground tracking-tight">
                Talon Scanner
              </h1>
              <p className="text-xs text-muted-foreground">
                Cititor certificat de înmatriculare
              </p>
            </div>
          </div>
          {result && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Scanare nouă
            </button>
          )}
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {!result ? (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Hero text */}
            <div className="text-center space-y-3 mb-8">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Scanează talonul auto
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Încarcă o fotografie cu certificatul de înmatriculare și extrage
                automat toate datele din document.
              </p>
            </div>

            {/* Upload */}
            <ImageUpload onImageSelect={processImage} isProcessing={isProcessing} />

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 animate-pulse text-primary" />
                    Se procesează documentul...
                  </span>
                  <span className="font-display text-primary font-bold">
                    {progress}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm text-center">
                {error}
              </div>
            )}

            {/* Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
              {[
                { title: "OCR Local", desc: "Procesare în browser, fără server" },
                { title: "24 Câmpuri", desc: "Toate rubricile A–X extrase" },
                { title: "Copiere rapidă", desc: "Un click pentru a copia datele" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-xl bg-card border border-border text-center"
                >
                  <p className="font-display text-sm font-bold text-foreground">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <DocumentResults fields={result.fields} />

            {/* Raw text toggle */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors font-display">
                ▸ Afișează textul brut OCR
              </summary>
              <pre className="mt-3 p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground overflow-auto max-h-[300px] font-display whitespace-pre-wrap">
                {result.rawText}
              </pre>
            </details>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
