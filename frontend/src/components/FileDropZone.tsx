import React, { useRef, useState } from 'react';

interface FileDropZoneProps {
  label: string;
  accept: string;
  icon: React.ElementType;
  file: File | null;
  onChange: (f: File | null) => void;
  hint: string;
}

export default function FileDropZone({
  label, accept, icon: Icon, file, onChange, hint
}: FileDropZoneProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
        dragging
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]'
          : file
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
      }`}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
      <Icon size={28} className={`mx-auto mb-2 ${file ? 'text-emerald-500' : 'text-slate-400'}`} />
      {file ? (
        <div>
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{file.name}</p>
          <p className="text-[10px] font-semibold text-emerald-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">{hint}</p>
        </div>
      )}
    </div>
  );
}
