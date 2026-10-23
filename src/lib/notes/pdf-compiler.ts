import { NotesBagItem, PdfCompilationConfig } from "./types";

/**
 * Compiles a list of NotesBagItem into a multi-page, handwritten-style HTML document
 * with strict pagination (default 2 items per page, max 3) designed for standard A4 printing.
 */
export function compileHandwrittenNotesHtml(
  items: NotesBagItem[],
  config: PdfCompilationConfig
): { html: string; totalPages: number } {
  const itemsPerPage = Math.max(1, Math.min(3, config.itemsPerPage || 2));
  const title = config.documentTitle || "DSA Mastery Handwritten Notes";

  // Chunk items strictly into pages of itemsPerPage
  const pages: NotesBagItem[][] = [];
  if (items.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < items.length; i += itemsPerPage) {
      pages.push(items.slice(i, i + itemsPerPage));
    }
  }

  const totalPages = Math.max(1, pages.length);

  const renderedPages = pages.map((pageItems, pageIdx) => {
    const pageNum = pageIdx + 1;

    const renderedItems = pageItems.length === 0
      ? `
        <div class="note-entry" style="text-align: center; padding: 48px 16px;">
          <h3 style="font-family: 'Kalam', cursive; font-size: 20px; color: #475569;">No items selected in Notes Bag</h3>
          <p style="font-family: 'Caveat', cursive; font-size: 16px; color: #94a3b8; margin-top: 8px;">
            Collect code snippets, whiteboard diagrams, or visualizer traces across DSA.viz.co to synthesize multi-page notes.
          </p>
        </div>
      `
      : pageItems.map((item, itemIdx) => {
      const globalItemIndex = pageIdx * itemsPerPage + itemIdx + 1;

      // Badges
      const sourceBadgeLabels: Record<string, string> = {
        COMPILER_CODE: "💻 Compiler Solution",
        VISUALIZER_TRACE: "📊 Algorithm State Trace",
        SMARTBOARD_WHITEBOARD: "🎨 Smartboard Canvas",
        AI_LEARNING_MODULE: "🧠 AI Learning Concept",
        PROBLEM_SOLUTION: "⚡ Problem Editorial",
        CUSTOM_NOTE: "📝 Handwritten Note",
      };
      const badgeText = sourceBadgeLabels[item.sourceType] || item.sourceType;

      return `
        <div class="note-entry">
          <!-- Item Header Strip -->
          <div class="entry-header">
            <div class="entry-title-wrap">
              <span class="entry-number">#${globalItemIndex}</span>
              <h2 class="entry-title">${escapeHtml(item.title)}</h2>
            </div>
            <div class="entry-badges">
              <span class="badge badge-source">${badgeText}</span>
              ${item.tags && item.tags.length > 0 ? item.tags.map(t => `<span class="badge badge-tag">#${escapeHtml(t)}</span>`).join("") : ""}
            </div>
          </div>

          <!-- Whiteboard / Canvas Snapshot -->
          ${item.canvasSnapshotUrl ? `
            <div class="snapshot-container">
              <img src="${item.canvasSnapshotUrl}" alt="${escapeHtml(item.title)}" class="snapshot-img" />
              <div class="caption">Whiteboard / Visual State Diagram</div>
            </div>
          ` : ""}

          <!-- Code Snippet -->
          ${item.codeSnippet ? `
            <div class="code-container">
              <div class="code-header">
                <span>${escapeHtml((item.codeLanguage || "cpp").toUpperCase())} IMPLEMENTATION</span>
                <span>Optimal Invariant</span>
              </div>
              <pre class="code-block"><code>${escapeHtml(item.codeSnippet)}</code></pre>
            </div>
          ` : ""}

          <!-- Compiler Output / Diagnostics if available -->
          ${item.compilerOutput ? `
            <div class="compiler-output-box">
              <span class="output-label">OUTPUT:</span>
              <pre class="output-text">${escapeHtml(item.compilerOutput)}</pre>
            </div>
          ` : ""}

          <!-- Invariant / Formula Sticky Note Callout -->
          ${item.invariantText ? `
            <div class="sticky-note">
              <div class="tape"></div>
              <div class="sticky-title">📌 Invariant Guarantee:</div>
              <div class="sticky-content">${escapeHtml(item.invariantText)}</div>
            </div>
          ` : ""}

          <!-- Visualizer Active Pointers & State -->
          ${item.activePointers && Object.keys(item.activePointers).length > 0 ? `
            <div class="pointers-pill-bar">
              <span class="pointers-title">🎯 Active Pointers:</span>
              ${Object.entries(item.activePointers).map(([k, v]) => `
                <span class="pointer-item"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</span>
              `).join("")}
            </div>
          ` : ""}

          <!-- Student Handwritten Marginalia / Notes -->
          ${item.userNotes ? `
            <div class="student-note-block">
              <span class="pen-icon">✍️</span>
              <span class="student-note-text">${escapeHtml(item.userNotes)}</span>
            </div>
          ` : ""}

          <!-- AI Synthesis / Key Takeaway -->
          ${item.aiTakeaway ? `
            <div class="ai-takeaway-bar">
              <span class="ai-sparkle">✨ Key Takeaway:</span>
              <span>${escapeHtml(item.aiTakeaway)}</span>
            </div>
          ` : ""}
        </div>
      `;
    }).join("\n");

    return `
      <div class="pdf-page">
        <!-- Notebook Margin Line (Left Red Rule) -->
        <div class="red-margin-line"></div>

        <!-- Page Header -->
        <div class="page-header">
          <div class="header-left">
            <span class="doc-title">${escapeHtml(title)}</span>
            <span class="doc-sub">DSA.viz.co Study Notes</span>
          </div>
          <div class="header-right">
            <span>Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span class="page-num-pill">Page ${pageNum} of ${totalPages}</span>
          </div>
        </div>

        <!-- Page Content -->
        <div class="page-content">
          ${renderedItems}
        </div>

        <!-- Page Footer -->
        <div class="page-footer">
          <span>Master algorithms by seeing how they think • Generated via DSA.viz.co AI NOTES</span>
          <span>Page ${pageNum} / ${totalPages}</span>
        </div>
      </div>
    `;
  }).join("\n");

  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@300;400;700&family=Fira+Code:wght@400;600&display=swap" rel="stylesheet">
  <style>
    /* CSS Print and Screen Styling for Multi-Page Handwritten Booklet */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 20px;
      background-color: #e5e5e5;
      font-family: 'Kalam', cursive, sans-serif;
      color: #1e293b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 25px;
    }

    /* Page Container simulating A4 */
    .pdf-page {
      width: 210mm;
      min-height: 297mm;
      background-color: #fefcf3;
      /* Ruled horizontal student paper background */
      background-image: linear-gradient(#e5e7eb 1px, transparent 1px);
      background-size: 100% 28px;
      padding: 22mm 18mm 20mm 28mm;
      position: relative;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Red Margin Rule on the left (classic looseleaf) */
    .red-margin-line {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 22mm;
      width: 2px;
      background-color: #fca5a5;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid #2b2d42;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }

    .doc-title {
      font-family: 'Caveat', cursive;
      font-size: 26px;
      font-weight: 700;
      color: #1e1b4b;
    }

    .doc-sub {
      font-size: 12px;
      color: #64748b;
      margin-left: 8px;
      font-family: monospace;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #475569;
    }

    .page-num-pill {
      background-color: #2b2d42;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      font-family: monospace;
    }

    /* Page Content Body */
    .page-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      flex: 1;
    }

    /* Note Entry Card */
    .note-entry {
      background-color: rgba(255, 255, 255, 0.92);
      border: 2px solid #2b2d42;
      border-radius: 12px;
      padding: 14px 18px;
      box-shadow: 3px 4px 0px #2b2d42;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      gap: 10px;
    }

    .entry-title-wrap {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .entry-number {
      font-family: 'Caveat', cursive;
      font-size: 22px;
      font-weight: 700;
      color: #4f46e5;
    }

    .entry-title {
      margin: 0;
      font-family: 'Caveat', cursive;
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.1;
    }

    .entry-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: flex-end;
    }

    .badge {
      font-size: 10px;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      font-weight: 600;
    }

    .badge-source {
      background-color: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    .badge-tag {
      background-color: #f1f5f9;
      color: #475569;
    }

    /* Snapshot Container */
    .snapshot-container {
      margin: 10px 0;
      border: 2px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      text-align: center;
      padding: 6px;
    }

    .snapshot-img {
      max-width: 100%;
      max-height: 140px;
      object-fit: contain;
      border-radius: 4px;
    }

    .caption {
      font-size: 10px;
      color: #94a3b8;
      font-family: monospace;
      margin-top: 4px;
    }

    /* Code Container */
    .code-container {
      margin: 8px 0;
      border: 2px solid #1e293b;
      border-radius: 8px;
      overflow: hidden;
      background-color: #0f172a;
      color: #f8fafc;
    }

    .code-header {
      background-color: #1e293b;
      padding: 4px 10px;
      font-size: 10px;
      font-family: monospace;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      border-bottom: 1px solid #334155;
    }

    .code-block {
      margin: 0;
      padding: 10px 12px;
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      line-height: 1.45;
      overflow-x: auto;
      white-space: pre-wrap;
    }

    .compiler-output-box {
      margin: 6px 0;
      padding: 6px 10px;
      background: #020617;
      border-radius: 6px;
      border: 1px solid #334155;
      font-family: monospace;
      font-size: 10px;
      color: #34d399;
    }

    .output-label {
      font-weight: bold;
      color: #64748b;
      display: block;
      margin-bottom: 2px;
    }

    .output-text {
      margin: 0;
      white-space: pre-wrap;
    }

    /* Sticky Note */
    .sticky-note {
      position: relative;
      background-color: #fef08a;
      border: 1px solid #fde047;
      border-radius: 6px;
      padding: 10px 12px;
      margin: 10px 0;
      box-shadow: 2px 3px 6px rgba(0, 0, 0, 0.08);
      font-family: 'Kalam', cursive;
    }

    .sticky-note .tape {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 50px;
      height: 14px;
      background: rgba(255, 255, 255, 0.65);
      border: 1px dashed rgba(0, 0, 0, 0.15);
    }

    .sticky-title {
      font-weight: 700;
      font-size: 13px;
      color: #854d0e;
      margin-bottom: 3px;
    }

    .sticky-content {
      font-size: 13px;
      color: #713f12;
      line-height: 1.35;
    }

    /* Pointers bar */
    .pointers-pill-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin: 6px 0;
      font-size: 11px;
      font-family: monospace;
      padding: 4px 8px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .pointers-title {
      font-weight: bold;
      color: #4338ca;
    }

    .pointer-item {
      background: #e0e7ff;
      color: #3730a3;
      padding: 1px 6px;
      border-radius: 4px;
    }

    /* Student handwritten note block */
    .student-note-block {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-family: 'Caveat', cursive;
      font-size: 17px;
      color: #1e40af;
      margin-top: 6px;
      padding: 4px 8px;
      background: rgba(239, 246, 255, 0.7);
      border-radius: 6px;
    }

    /* AI Takeaway banner */
    .ai-takeaway-bar {
      margin-top: 6px;
      font-size: 11px;
      padding: 5px 8px;
      background: #f5f3ff;
      border-left: 3px solid #8b5cf6;
      color: #5b21b6;
      border-radius: 0 4px 4px 0;
      font-family: 'Kalam', cursive;
    }

    .ai-sparkle {
      font-weight: bold;
      margin-right: 4px;
    }

    /* Footer */
    .page-footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      font-size: 10px;
      color: #94a3b8;
      font-family: monospace;
    }

    /* Print media overrides */
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
        gap: 0 !important;
      }
      .pdf-page {
        width: 100% !important;
        min-height: 100% !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        padding: 12mm 12mm 12mm 24mm !important;
      }
    }
  </style>
</head>
<body>
  ${renderedPages}
</body>
</html>
  `;

  return {
    html: fullHtml,
    totalPages,
  };
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
