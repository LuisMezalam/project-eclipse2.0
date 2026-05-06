// CSV Export utility
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ];
  
  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

// Simple text-based report export (PDF-like format as plain text)
export function exportToReport(sections: ReportSection[], filename: string): void {
  const lines: string[] = [];
  const divider = '═'.repeat(60);
  const subDivider = '─'.repeat(60);
  
  lines.push(divider);
  lines.push('STRUCTURAL RELIABILITY ANALYSIS REPORT');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(divider);
  lines.push('');
  
  sections.forEach((section, index) => {
    lines.push(`${index + 1}. ${section.title.toUpperCase()}`);
    lines.push(subDivider);
    
    if (section.description) {
      lines.push(section.description);
      lines.push('');
    }
    
    if (section.data) {
      section.data.forEach(item => {
        const value = typeof item.value === 'number' 
          ? item.value.toFixed(item.precision ?? 4)
          : String(item.value);
        lines.push(`  ${item.label}: ${value}${item.unit ? ` ${item.unit}` : ''}`);
      });
    }
    
    if (section.table) {
      lines.push('');
      const headers = section.table.headers;
      const colWidths = headers.map((h, i) => 
        Math.max(h.length, ...section.table!.rows.map(r => String(r[i] ?? '').length))
      );
      
      lines.push('  ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' | '));
      lines.push('  ' + colWidths.map(w => '-'.repeat(w)).join('-+-'));
      section.table.rows.forEach(row => {
        lines.push('  ' + row.map((cell, i) => String(cell ?? '').padEnd(colWidths[i])).join(' | '));
      });
    }
    
    lines.push('');
  });
  
  lines.push(divider);
  lines.push('End of Report');
  lines.push(divider);
  
  downloadFile(lines.join('\n'), `${filename}.txt`, 'text/plain');
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Export as HTML (can be printed as PDF from browser)
export function exportToHTML(sections: ReportSection[], filename: string): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Structural Reliability Analysis Report</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
    h1 { color: #0284c7; border-bottom: 3px solid #0284c7; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 30px; }
    .description { color: #4b5563; margin-bottom: 15px; font-style: italic; }
    .data-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .data-item { background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #0284c7; }
    .data-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .data-value { font-size: 18px; font-weight: 600; color: #111827; font-family: 'JetBrains Mono', monospace; }
    .data-unit { font-size: 12px; color: #9ca3af; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:hover { background: #f9fafb; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Structural Reliability Analysis Report</h1>
  <p class="meta">Generated: ${escapeHtml(new Date().toLocaleString())}</p>
  
  ${sections.map((section, index) => `
    <h2>${index + 1}. ${escapeHtml(section.title)}</h2>
    ${section.description ? `<p class="description">${escapeHtml(section.description)}</p>` : ''}
    ${section.data ? `
      <div class="data-grid">
        ${section.data.map(item => `
          <div class="data-item">
            <div class="data-label">${escapeHtml(item.label)}</div>
            <div class="data-value">
              ${typeof item.value === 'number' ? item.value.toFixed(item.precision ?? 4) : escapeHtml(item.value)}
              ${item.unit ? `<span class="data-unit">${escapeHtml(item.unit)}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
    ${section.table ? `
      <table>
        <thead>
          <tr>${section.table.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${section.table.rows.map(row => `
            <tr>${row.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  `).join('')}
  
  <div class="footer">
    <p>Generated by Structural Reliability Analysis System</p>
    <p class="no-print">To save as PDF: Press Ctrl+P (or Cmd+P) and select &quot;Save as PDF&quot;</p>
  </div>
</body>
</html>`;

  downloadFile(html, `${filename}.html`, 'text/html');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ReportSection {
  title: string;
  description?: string;
  data?: Array<{
    label: string;
    value: string | number;
    unit?: string;
    precision?: number;
  }>;
  table?: {
    headers: string[];
    rows: (string | number | null)[][];
  };
}
