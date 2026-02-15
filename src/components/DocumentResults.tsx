import type { DocumentField } from "@/lib/documentParser";
import { CheckCircle, AlertCircle, Copy, Check } from "lucide-react";
import { useState } from "react";

interface DocumentResultsProps {
  fields: DocumentField[];
}

const FieldCard = ({ field }: { field: DocumentField }) => {
  const [copied, setCopied] = useState(false);
  const hasValue = field.value.length > 0;

  const handleCopy = () => {
    if (!hasValue) return;
    navigator.clipboard.writeText(field.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`group p-4 rounded-xl border transition-all duration-200 ${
        hasValue
          ? "bg-card border-border hover:border-primary/30 hover:scanner-glow"
          : "bg-secondary/30 border-border/50 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-xs font-bold text-primary tracking-wider">
              {field.code}
            </span>
            {hasValue ? (
              <CheckCircle className="w-3.5 h-3.5 text-success" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2">{field.label}</p>
          <p className="text-sm font-medium text-foreground break-all font-display">
            {hasValue ? field.value : "—"}
          </p>
        </div>
        {hasValue && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-secondary"
            title="Copiază"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const DocumentResults = ({ fields }: DocumentResultsProps) => {
  const filledCount = fields.filter((f) => f.value.length > 0).length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-foreground">
          Rezultate
        </h2>
        <span className="text-sm text-muted-foreground font-display">
          <span className="text-success font-bold">{filledCount}</span>
          <span className="mx-1">/</span>
          <span>{fields.length}</span>
          <span className="ml-1">câmpuri detectate</span>
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((field) => (
          <FieldCard key={field.code} field={field} />
        ))}
      </div>
    </div>
  );
};

export default DocumentResults;
