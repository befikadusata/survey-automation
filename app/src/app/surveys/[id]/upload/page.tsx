'use client';

import { useCallback, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Papa from 'papaparse';

type ColumnMap = Record<string, string>; // csvHeader → mappedField

const FIELD_OPTIONS = ['email', 'first_name', 'last_name', '(extra metadata)'];

export default function UploadPage() {
  const params = useParams<{ id: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const processFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError('');

    Papa.parse<Record<string, string>>(f, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const headers = meta.fields ?? [];
        setCsvHeaders(headers);
        setPreview(data);

        // Auto-detect standard columns
        const autoMap: ColumnMap = {};
        for (const h of headers) {
          const lower = h.toLowerCase().trim();
          if (lower === 'email' || lower === 'e-mail') autoMap[h] = 'email';
          else if (lower.includes('first')) autoMap[h] = 'first_name';
          else if (lower.includes('last') || lower === 'surname') autoMap[h] = 'last_name';
          else autoMap[h] = '(extra metadata)';
        }
        setColumnMap(autoMap);
      },
    });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    // Build the final map — skip (extra metadata) entries, pass them as-is
    const finalMap: ColumnMap = {};
    for (const [h, field] of Object.entries(columnMap)) {
      if (field !== '(extra metadata)') finalMap[h] = field;
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('columnMap', JSON.stringify(finalMap));

    try {
      const res = await fetch(`/api/surveys/${params?.id}/respondents`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setResult(data);
      setFile(null);
      setCsvHeaders([]);
      setPreview([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const emailMapped = Object.values(columnMap).includes('email');

  return (
    <>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-header-left">
          <h2>Upload Respondents</h2>
          <p className="page-subtitle">Import a CSV or Excel export. Duplicate emails are skipped automatically.</p>
        </div>
      </div>

      {result && (
        <div className="alert alert-success">
          ✅ Import complete: <strong>{result.inserted}</strong> respondents added,{' '}
          <strong>{result.skipped}</strong> skipped (duplicates or missing email) out of <strong>{result.total}</strong> rows.
        </div>
      )}
      {error && <div className="alert alert-danger">❌ {error}</div>}

      {/* Step 1 — Drop zone */}
      {!file && (
        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="dropzone-icon">📁</div>
          <h3>Drop your CSV here</h3>
          <p style={{ marginTop: 6, fontSize: 13 }}>or click to browse — CSV files only</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* Step 2 — Column mapping + preview */}
      {file && csvHeaders.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16 }}>
              Column Mapping
              <span style={{ fontWeight: 400, fontSize: 12.5, color: 'var(--text-secondary)', marginLeft: 10 }}>
                {file.name} · {csvHeaders.length} columns
              </span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px 16px', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>CSV Column</div>
              <div />
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Maps to</div>
              {csvHeaders.map(h => (
                <>
                  <div key={`h-${h}`} style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--bg-input)', padding: '7px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    {h}
                  </div>
                  <div key={`arrow-${h}`} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>→</div>
                  <select
                    key={`sel-${h}`}
                    className="form-select"
                    value={columnMap[h] ?? '(extra metadata)'}
                    onChange={e => setColumnMap(prev => ({ ...prev, [h]: e.target.value }))}
                  >
                    {FIELD_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </>
              ))}
            </div>
          </div>

          {/* Preview table */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16 }}>Preview (first 5 rows)</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{csvHeaders.map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {csvHeaders.map(h => <td key={h} className="table-mono">{row[h] ?? ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!emailMapped && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              ⚠️ No column is mapped to <strong>email</strong>. Map at least one column before uploading.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading || !emailMapped}
            >
              {uploading ? <span className="spinner" /> : null}
              {uploading ? 'Uploading…' : `Import ${file.name}`}
            </button>
            <button className="btn btn-secondary" onClick={() => { setFile(null); setCsvHeaders([]); setPreview([]); }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </>
  );
}
