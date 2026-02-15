import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ImageUpload from "@/components/ImageUpload";
import DocumentResults from "@/components/DocumentResults";
import { mapApiResponse, type ParsedDocument } from "@/lib/documentParser";
import { ScanLine, RotateCcw } from "lucide-react";
import { toast } from "sonner";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParsedDocument | null>(null);

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setResult(null);

    try {
      const imageBase64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke("ocr-document", {
        body: { imageBase64, mimeType: file.type },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const parsed = mapApiResponse(data.fields || {});
      setResult(parsed);
      toast.success("Document procesat cu succes!");
    } catch (err) {
      console.error("OCR Error:", err);
      toast.error("Eroare la procesarea imaginii. Încearcă din nou.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
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
            <div className="text-center space-y-3 mb-8">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Scanează talonul auto
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Încarcă o fotografie cu certificatul de înmatriculare și extrage
                automat toate datele din document folosind inteligență artificială.
              </p>
            </div>

            <ImageUpload onImageSelect={processImage} isProcessing={isProcessing} />

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Se analizează documentul cu AI...</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
              {[
                { title: "AI Vision", desc: "Recunoaștere avansată cu AI" },
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
          <DocumentResults fields={result.fields} />
        )}
      </main>
    </div>
  );
};

export default Index;
