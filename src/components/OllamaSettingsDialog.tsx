import { useState } from "react";
import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  OllamaSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from "@/lib/ollamaSettings";

interface OllamaSettingsDialogProps {
  settings: OllamaSettings;
  onSave: (s: OllamaSettings) => void;
}

const OllamaSettingsDialog = ({ settings, onSave }: OllamaSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [model, setModel] = useState(settings.model);

  const handleSave = () => {
    const next: OllamaSettings = { baseUrl: baseUrl.trim() || DEFAULT_SETTINGS.baseUrl, model: model.trim() || DEFAULT_SETTINGS.model };
    saveSettings(next);
    onSave(next);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
          title="Setări Ollama"
        >
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">Setări Ollama</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurare Ollama local</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ollama-url">URL Ollama</Label>
            <Input
              id="ollama-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={DEFAULT_SETTINGS.baseUrl}
            />
            <p className="text-xs text-muted-foreground">
              Adresa serverului Ollama (implicit: http://localhost:11434).
              Asigurați-vă că Ollama rulează cu{" "}
              <code className="bg-muted px-1 rounded">OLLAMA_ORIGINS=*</code>.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ollama-model">Model</Label>
            <Input
              id="ollama-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_SETTINGS.model}
            />
            <p className="text-xs text-muted-foreground">
              Modelul vision instalat în Ollama (ex: <code className="bg-muted px-1 rounded">qwen2-vl</code>,{" "}
              <code className="bg-muted px-1 rounded">llava</code>,{" "}
              <code className="bg-muted px-1 rounded">minicpm-v</code>).
            </p>
          </div>
          <div className="pt-1 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSave}>Salvează</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OllamaSettingsDialog;
