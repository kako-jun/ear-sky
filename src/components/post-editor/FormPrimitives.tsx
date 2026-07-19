import type React from "react";
import { X } from "lucide-react";

export function OptionalLabel({ text }: { text: string }) {
  return <span className="text-neon-blue/40 text-xs ml-1.5">{text}</span>;
}

type ClearableInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function ClearableInput({ value, onChange, className, ...props }: ClearableInputProps) {
  return (
    <div className="relative">
      <input
        {...props}
        value={value}
        onChange={onChange}
        className={`${className} pr-10`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>)}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/30 hover:text-white/50 transition-colors"
          tabIndex={-1}
          aria-label="Clear"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export function SectionHeader({ text }: { text: string }) {
  return (
    <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest border-b border-white/10 pb-1 mb-3">
      {text}
    </h3>
  );
}

export function fieldId(name: string) {
  return `post-editor-${name}`;
}
