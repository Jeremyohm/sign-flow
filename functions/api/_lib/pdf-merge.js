import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Editor renders pdf.js at scale 1.5 and stores field coords in those rendered
// pixels (top-left origin). Convert back to PDF points before drawing.
// See src/components/editor/DocumentCanvas.jsx:23-30 for the storage convention.
const RENDER_SCALE = 1.5;

/**
 * Merge field values into a PDF at specified coordinates.
 * fieldValues: [{ page, x, y, w, h, value }]
 * Coordinates are stored at 1.5× PDF-point scale, top-left origin; converted
 * to PDF points and bottom-left origin before drawing.
 *
 * Values starting with "data:image/" are embedded as images (drawn signatures /
 * initials). Anything else is rendered as text.
 */
export async function mergePdfFields(pdfBytes, fieldValues) {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (const field of fieldValues) {
    const page = pages[field.page || 0];
    if (!page) continue;
    const { height: ph } = page.getSize();
    const fieldX = (field.x || 0) / RENDER_SCALE;
    const fieldY = (field.y || 0) / RENDER_SCALE;
    const fieldW = (field.w || 150) / RENDER_SCALE;
    const fieldH = (field.h || 14) / RENDER_SCALE;
    const pdfY = ph - fieldY - fieldH;

    const value = field.value;

    if (typeof value === "string" && value.startsWith("data:image/")) {
      const match = value.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
      if (!match) {
        console.warn("Field has unrecognized image data URL; skipping");
        continue;
      }
      const format = match[1].toLowerCase();
      const b64 = match[2];

      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      let img;
      try {
        img = format === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      } catch (err) {
        console.error("Failed to embed image for field:", err);
        continue;
      }

      page.drawImage(img, { x: fieldX, y: pdfY, width: fieldW, height: fieldH });

      if (field.type === "signature" && (field.signer_name || field.signed_at)) {
        drawSignatureBlock(page, font, {
          x: fieldX,
          yTop: pdfY,
          width: fieldW,
          name: field.signer_name,
          signedAt: field.signed_at,
        });
      }
      continue;
    }

    const fontSize = autoFontSize(font, value, fieldW, fieldH);
    page.drawText(String(value ?? ""), {
      x: fieldX,
      y: pdfY + 2,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: fieldW,
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

function drawSignatureBlock(page, font, { x, yTop, width, name, signedAt }) {
  const ruleY = yTop - 4;
  page.drawLine({
    start: { x, y: ruleY },
    end: { x: x + width, y: ruleY },
    thickness: 0.5,
    color: rgb(0.612, 0.639, 0.686),
  });

  if (name) {
    page.drawText(name, {
      x,
      y: ruleY - 11,
      size: 9,
      font,
      color: rgb(0.122, 0.161, 0.216),
    });
  }

  if (signedAt) {
    page.drawText(`Signed ${formatSignedDate(signedAt)}`, {
      x,
      y: ruleY - 22,
      size: 8,
      font,
      color: rgb(0.420, 0.447, 0.502),
    });
  }
}

function formatSignedDate(iso) {
  const d = new Date(iso);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
