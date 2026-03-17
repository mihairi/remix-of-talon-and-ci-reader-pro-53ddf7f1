import { useState } from "react";
import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { type OllamaSettings } from "@/lib/ollamaSettings";

interface OllamaSettingsDialogProps {
  settings: OllamaSettings;
}

const OllamaSettingsDialog = ({ settings }: OllamaSettingsDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
          title="Setări OCR"
        >
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">Setări OCR</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurare server OCR</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Format API</Label>
            <p className="text-sm bg-muted px-3 py-2 rounded-md">{settings.apiFormat === "ollama" ? "Ollama" : "OpenAI-compatible"}</p>
          </div>
          <div className="space-y-1">
            <Label>URL Server</Label>
            <p className="text-sm bg-muted px-3 py-2 rounded-md font-mono">{settings.baseUrl}</p>
          </div>
          <div className="space-y-1">
            <Label>Model</Label>
            <p className="text-sm bg-muted px-3 py-2 rounded-md font-mono">{settings.model}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Setările se configurează din fișierul <code className="bg-muted px-1 rounded">public/ocr-settings.json</code>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OllamaSettingsDialog;
