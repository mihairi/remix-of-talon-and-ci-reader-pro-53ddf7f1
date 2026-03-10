import { useState, useCallback } from "react";
import ImageUpload from "@/components/ImageUpload";
import DocumentResults from "@/components/DocumentResults";
import OllamaSettingsDialog from "@/components/OllamaSettingsDialog";
import { mapApiResponse, type ParsedDocument } from "@/lib/documentParser";
import { mapIdCardResponse, type ParsedIdCard } from "@/lib/idCardParser";
import { runOllamaOcr } from "@/lib/ollamaOcr";
import { loadSettings, type OllamaSettings } from "@/lib/ollamaSettings";
import { pdfToImages } from "@/lib/pdfUtils";
import { RotateCcw, Car, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DocType = "talon" | "id-card";
type ResultData = { type: DocType; fields: { code: string; label: string; value: string }[] };

const Index = () => {
  const [docType, setDocType] = useState<DocType>("talon");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettings>(loadSettings);

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setResult(null);
    try {
      const fields = await runOllamaOcr(file, docType, ollamaSettings);
      if (docType === "talon") {
        const parsed = mapApiResponse(fields);
        setResult({ type: "talon", fields: parsed.fields });
      } else {
        const parsed = mapIdCardResponse(fields);
        setResult({ type: "id-card", fields: parsed.fields });
      }
      toast.success("Document procesat cu succes!");
    } catch (err: any) {
      console.error("OCR Error:", err);
      toast.error(err?.message || "Eroare la procesarea imaginii.");
    } finally {
      setIsProcessing(false);
    }
  }, [docType, ollamaSettings]);

  const processPdf = useCallback(async (file: File) => {
    setIsProcessing(true);
    setResult(null);
    try {
      toast.info("Se convertesc paginile PDF...");
      const images = await pdfToImages(file);
      if (images.length === 0) throw new Error("PDF-ul nu conține pagini.");
      // Process first page (main document page)
      toast.info(`Se procesează pagina 1 din ${images.length}...`);
      const fields = await runOllamaOcr(images[0], docType, ollamaSettings);
      if (docType === "talon") {
        const parsed = mapApiResponse(fields);
        setResult({ type: "talon", fields: parsed.fields });
      } else {
        const parsed = mapIdCardResponse(fields);
        setResult({ type: "id-card", fields: parsed.fields });
      }
      toast.success("Document PDF procesat cu succes!");
    } catch (err: any) {
      console.error("PDF OCR Error:", err);
      toast.error(err?.message || "Eroare la procesarea PDF-ului.");
    } finally {
      setIsProcessing(false);
    }
  }, [docType, ollamaSettings]);

  const uploadLabel = docType === "talon" ? "Încarcă fotografia talonului" : "Încarcă fotografia cărții de identitate";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top bar: settings + reset */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-display font-bold text-foreground">
            Document Scanner
          </h1>
          <div className="flex items-center gap-2">
            <OllamaSettingsDialog settings={ollamaSettings} onSave={setOllamaSettings} />
            {result && (
              <button
                onClick={() => setResult(null)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Scanare nouă
              </button>
            )}
          </div>
        </div>

        {!result ? (
          <div className="space-y-4">
            <Tabs value={docType} onValueChange={(v) => setDocType(v as DocType)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="talon" className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Talon auto
                </TabsTrigger>
                <TabsTrigger value="id-card" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Carte de identitate
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <ImageUpload onImageSelect={processImage} onPdfSelect={processPdf} isProcessing={isProcessing} uploadLabel={uploadLabel} />

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Se procesează...</span>
              </div>
            )}
          </div>
        ) : (
          <DocumentResults fields={result.fields} />
        )}
      </div>
    </div>
  );
};

export default Index;
