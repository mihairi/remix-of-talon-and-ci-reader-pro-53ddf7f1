import { useState } from "react";
import { Settings2, Lock } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type OllamaSettings,
  type ApiFormat,
  saveSettings,
  DEFAULT_SETTINGS,
} from "@/lib/ollamaSettings";
import { ADMIN_PASSWORD } from "@/config/adminPassword";
import { toast } from "sonner";

interface OllamaSettingsDialogProps {
  settings: OllamaSettings;
  onSave: (s: OllamaSettings) => void;
}

const API_FORMAT_OPTIONS: { value: ApiFormat; label: string; description: string }[] = [
  {
    value: "ollama",
    label: "Ollama",
    description: "Format nativ Ollama (/api/chat)",
  },
  {
    value: "openai-compatible",
    label: "OpenAI-compatible",
    description: "LM Studio, LocalAI, llama.cpp (/v1/chat/completions)",
  },
];

const OllamaSettingsDialog = ({ settings, onSave }: OllamaSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [model, setModel] = useState(settings.model);
  const [apiFormat, setApiFormat] = useState<ApiFormat>(settings.apiFormat);

  const defaultUrl = apiFormat === "ollama" ? "http://localhost:11434" : "http://localhost:1234";

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPassword("");
    } else {
      toast.error("Parolă incorectă");
    }
  };

  const handleSave = () => {
    const next: OllamaSettings = {
      baseUrl: baseUrl.trim() || defaultUrl,
      model: model.trim() || DEFAULT_SETTINGS.model,
      apiFormat,
    };
    saveSettings(next);
    onSave(next);
    setOpen(false);
    toast.success("Setările au fost salvate");
  };

  const handleFormatChange = (value: ApiFormat) => {
    setApiFormat(value);
    if (baseUrl === "http://localhost:11434" || baseUrl === "http://localhost:1234") {
      setBaseUrl(value === "ollama" ? "http://localhost:11434" : "http://localhost:1234");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setAuthenticated(false);
      setPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <DialogTitle>
            {authenticated ? "Configurare server OCR local" : "Autentificare admin"}
          </DialogTitle>
        </DialogHeader>

        {!authenticated ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Parolă admin</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="Introduceți parola"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleLogin}>Autentificare</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="api-format">Format API</Label>
              <Select value={apiFormat} onValueChange={(v) => handleFormatChange(v as ApiFormat)}>
                <SelectTrigger id="api-format" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {API_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ollama-url">URL Server</Label>
              <Input
                id="ollama-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={defaultUrl}
              />
              <p className="text-xs text-muted-foreground">
                {apiFormat === "ollama"
                  ? <>Adresa serverului Ollama (implicit: http://localhost:11434). Asigurați-vă că Ollama rulează cu{" "}<code className="bg-muted px-1 rounded">OLLAMA_ORIGINS=*</code>.</>
                  : <>Adresa serverului local (implicit: http://localhost:1234 pentru LM Studio). Asigurați-vă că serverul API este pornit.</>}
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
                {apiFormat === "ollama"
                  ? <>Modelul vision instalat în Ollama (ex: <code className="bg-muted px-1 rounded">glm-ocr</code>, <code className="bg-muted px-1 rounded">llava</code>).</>
                  : <>Modelul vision încărcat în server (ex: <code className="bg-muted px-1 rounded">qwen2-vl-7b</code>, <code className="bg-muted px-1 rounded">llava-v1.6</code>).</>}
              </p>
            </div>
            <div className="pt-1 flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Anulează
              </Button>
              <Button onClick={handleSave}>Salvează</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OllamaSettingsDialog;
