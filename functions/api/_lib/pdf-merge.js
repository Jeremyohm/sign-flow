import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Merge text values into a PDF at specified coordinates.
 * fieldValues: [{ page, x, y, w, h, value }]
 * Coordinates: x/y from top-left of page (converted to PDF bottom-left origin internally).
 */
export async function mergePdfFields(pdfBytes, fieldValues) {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (const field of fieldValues) {
    const page = pages[field.page || 0];
    if (!page) continue;
    const { width: pw, height: ph } = page.getSize();
    const fontSize = autoFontSize(font, field.value, field.w || 150, field.h || 14);
    // field.y is from top, PDF y is from bottom
    const pdfY = ph - (field.y || 0) - (field.h || 14);
    page.drawText(String(field.value), {
      x: field.x || 0,
      y: pdfY + 2,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: field.w || 150,
    });
  }

  return await doc.save();
}

/**
 * Add a key items table to a specific page of a PDF.
 * items: [{ name, value }]
 * opts: { x, y, width, headerText }
 */
export async function addKeyItemsTable(pdfBytes, pageIndex, items, opts = {}) {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  const page = pages[pageIndex || 0];
  if (!page) return await doc.save();

  const { width: pw, height: ph } = page.getSize();
  const x = opts.x || 50;
  const tableWidth = opts.width || pw - 100;
  const headerText = opts.headerText || "Key Items";
  const rowH = 20;
  const headerH = 26;

  // Start y from top of page
  let startY = opts.y ? (ph - opts.y) : (ph - 100);

  // Draw header
  page.drawRectangle({
    x, y: startY - headerH, width: tableWidth, height: headerH,
    color: rgb(0.93, 0.91, 0.87),
  });
  page.drawText(headerText, {
    x: x + 10, y: startY - headerH + 8, size: 11, font: bold,
    color: rgb(0.17, 0.16, 0.15),
  });

  // Column headers
  startY -= headerH;
  page.drawRectangle({
    x, y: startY - rowH, width: tableWidth, height: rowH,
    color: rgb(0.96, 0.95, 0.93),
  });
  page.drawText("Item", {
    x: x + 10, y: startY - rowH + 6, size: 9, font: bold,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText("Value", {
    x: x + tableWidth - 100, y: startY - rowH + 6, size: 9, font: bold,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Separator line
  startY -= rowH;
  page.drawLine({
    start: { x, y: startY },
    end: { x: x + tableWidth, y: startY },
    thickness: 0.5,
    color: rgb(0.8, 0.78, 0.75),
  });

  // Data rows
  for (const item of items) {
    page.drawText(String(item.name || ""), {
      x: x + 10, y: startY - rowH + 6, size: 9, font,
      color: rgb(0.17, 0.16, 0.15), maxWidth: tableWidth - 130,
    });
    page.drawText(String(item.value || ""), {
      x: x + tableWidth - 100, y: startY - rowH + 6, size: 9, font,
      color: rgb(0.17, 0.16, 0.15), maxWidth: 90,
    });
    startY -= rowH;
    // Light separator between rows
    page.drawLine({
      start: { x, y: startY },
      end: { x: x + tableWidth, y: startY },
      thickness: 0.25,
      color: rgb(0.88, 0.86, 0.84),
    });
  }

  return await doc.save();
}

function autoFontSize(font, text, maxW, maxH) {
  let size = Math.min(maxH - 2, 14);
  while (size > 6) {
    const w = font.widthOfTextAtSize(String(text), size);
    if (w <= maxW - 4) break;
    size -= 0.5;
  }
  return size;
}
