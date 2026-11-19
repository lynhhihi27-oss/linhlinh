export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Yêu cầu không thành công.');
  }

  return data;
}

export function Metric({ label, value, tone = 'gold' }) {
  return (
    <div className={`feature-metric feature-metric-${tone}`}>
      <span>{label}</span>
      <strong>{Number(value || 0).toLocaleString('vi-VN')}</strong>
    </div>
  );
}

export function Empty({ children }) {
  return <div className="feature-empty">{children}</div>;
}

export function DownloadCsv({ rows, filename }) {
  const onDownload = () => {
    if (!rows.length) return;
    const columns = Object.keys(rows[0]);
    const csv = [
      columns.join(','),
      ...rows.map(row => columns.map(column => `"${String(row[column] ?? '').replaceAll('"', '""')}"`).join(','))
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button className="btn btn-secondary btn-sm" onClick={onDownload} disabled={!rows.length}>
      Xuất CSV
    </button>
  );
}
