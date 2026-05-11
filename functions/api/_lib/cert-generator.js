import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { FRAUNCES_SEMIBOLD_B64, b64ToBytes } from "./fonts.js";

// US Letter portrait (612x792 points)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const MARGIN_TOP = 54;
const MARGIN_BOTTOM = 54;
const HEADER_HEIGHT = 36;
const FOOTER_HEIGHT = 24;
const CONTENT_TOP = PAGE_HEIGHT - MARGIN_TOP - HEADER_HEIGHT;
const CONTENT_BOTTOM = MARGIN_BOTTOM + FOOTER_HEIGHT;

const COLOR_TEXT = rgb(0.1, 0.1, 0.12);
const COLOR_MUTED = rgb(0.45, 0.45, 0.5);
const COLOR_RULE = rgb(0.85, 0.85, 0.88);
const COLOR_ACCENT = rgb(0.118, 0.318, 0.157);

/**
 * Generate a Certificate of Completion PDFDocument.
 * data: { envelope, owner, signers, consent_records, audit_events }
 *       (output of get_envelope_for_certificate RPC)
 */
export async function generateCertificate(data) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fraunces = await pdf.embedFont(b64ToBytes(FRAUNCES_SEMIBOLD_B64));

  const fonts = { regular: helvetica, semibold: helveticaBold, fraunces };

  const ctx = { pdf, fonts, pages: [], currentPage: null, cursorY: 0 };

  newPage(ctx);

  // Title
  drawText(ctx, "Certificate of Completion", { font: fonts.semibold, size: 22 });
  ctx.cursorY -= 4;
  drawText(ctx, data.envelope.name || "(unnamed envelope)",
    { font: fonts.regular, size: 13, color: COLOR_MUTED });
  ctx.cursorY -= 4;
  drawText(ctx, `Envelope ID: ${data.envelope.id}`,
    { font: fonts.regular, size: 9, color: COLOR_MUTED });
  ctx.cursorY -= 14;
  drawHorizontalRule(ctx);
  ctx.cursorY -= 14;

  // Document fingerprint
  drawText(ctx, "Document Fingerprint", { font: fonts.semibold, size: 12 });
  ctx.cursorY -= 6;
  drawKeyValue(ctx, "Original PDF (SHA-256)",
    data.envelope.original_pdf_sha256 || "(unavailable)");
  drawKeyValue(ctx, "Signed Document (SHA-256)",
    data.envelope.final_pdf_sha256 || "(unavailable)");
  ctx.cursorY -= 10;

  // Signers
  drawText(ctx, "Signers", { font: fonts.semibold, size: 12 });
  ctx.cursorY -= 6;

  for (const signer of (data.signers || [])) {
    if (ctx.cursorY < CONTENT_BOTTOM + 100) newPage(ctx);

    drawText(ctx, `${signer.name || "(no name)"} <${signer.email || "(no email)"}>`,
      { font: fonts.semibold, size: 11 });
    drawText(ctx, `Role: ${signer.role || "Signer"}`,
      { font: fonts.regular, size: 10, color: COLOR_MUTED });

    if (signer.status === "signed") {
      drawText(ctx, `Signed at: ${formatTimestamp(signer.signed_at)}`,
        { font: fonts.regular, size: 10 });

      const consent = (data.consent_records || []).find(c => c.signer_id === signer.id);
      if (consent) {
        drawText(ctx, `Consent: ${consent.disclosure_version} on ${formatTimestamp(consent.consented_at)}`,
          { font: fonts.regular, size: 9, color: COLOR_MUTED });
        drawText(ctx, `IP: ${consent.ip || "unknown"}`,
          { font: fonts.regular, size: 9, color: COLOR_MUTED });
        drawText(ctx, `User Agent: ${truncate(consent.user_agent || "unknown", 90)}`,
          { font: fonts.regular, size: 9, color: COLOR_MUTED });
      } else {
        drawText(ctx, "Consent record: not found",
          { font: fonts.regular, size: 9, color: COLOR_MUTED });
      }
    } else if (signer.status === "declined") {
      drawText(ctx, `Declined at: ${formatTimestamp(signer.declined_at)}`,
        { font: fonts.regular, size: 10, color: rgb(0.7, 0.2, 0.2) });
      drawText(ctx, `Reason: ${signer.decline_reason || "(none provided)"}`,
        { font: fonts.regular, size: 9, color: COLOR_MUTED });
    } else {
      drawText(ctx, `Status: ${signer.status}`, { font: fonts.regular, size: 10 });
    }

    ctx.cursorY -= 12;
  }

  ctx.cursorY -= 6;

  // Disclosure text (verbatim, dedup by version)
  const seen = new Set();
  for (const consent of (data.consent_records || [])) {
    if (seen.has(consent.disclosure_version)) continue;
    seen.add(consent.disclosure_version);

    if (ctx.cursorY < CONTENT_BOTTOM + 80) newPage(ctx);
    drawText(ctx, `ESIGN/UETA Disclosure (version ${consent.disclosure_version})`,
      { font: fonts.semibold, size: 11 });
    ctx.cursorY -= 4;
    drawWrappedText(ctx, consent.disclosure_text || "",
      { font: fonts.regular, size: 9, color: COLOR_MUTED });
    ctx.cursorY -= 14;
  }

  // Audit timeline
  if (ctx.cursorY < CONTENT_BOTTOM + 60) newPage(ctx);
  drawHorizontalRule(ctx);
  ctx.cursorY -= 12;
  drawText(ctx, "Audit Timeline", { font: fonts.semibold, size: 12 });
  ctx.cursorY -= 8;

  for (const event of (data.audit_events || [])) {
    if (ctx.cursorY < CONTENT_BOTTOM + 30) newPage(ctx);

    const ts = formatTimestamp(event.created_at);
    const actor = event.actor_email || "(system)";
    const ip = event.actor_ip ? ` from ${event.actor_ip}` : "";

    drawText(ctx, `${ts} — ${event.event_type}`, { font: fonts.semibold, size: 9 });
    drawText(ctx, `${actor}${ip}`, { font: fonts.regular, size: 9, color: COLOR_MUTED });
    ctx.cursorY -= 6;
  }

  // Footers (page numbers)
  const totalPages = ctx.pages.length;
  ctx.pages.forEach((page, i) => {
    drawFooter(page, fonts, i + 1, totalPages, data.envelope.id);
  });

  return pdf;
}

// ---- Layout primitives ----

function newPage(ctx) {
  const page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.pages.push(page);
  ctx.currentPage = page;
  ctx.cursorY = CONTENT_TOP;

  // Sign Flow brand: curve mark + Fraunces wordmark, both bottle green.
  // SVG path is in a 32x20 viewBox; drawSvgPath anchors SVG (0,0) at (x,y)
  // and y-flips internally so the curve renders right-side-up.
  page.drawSvgPath(
    "M2 14 C 4 12, 6 10, 9 13 C 12 16, 16 6, 20 8 C 24 10, 27 7, 30 4",
    {
      x: MARGIN_X,
      y: PAGE_HEIGHT - MARGIN_TOP + 18,
      borderColor: COLOR_ACCENT,
      borderWidth: 2.2,
    },
  );
  page.drawText("Sign Flow", {
    x: MARGIN_X + 38,
    y: PAGE_HEIGHT - MARGIN_TOP + 6,
    size: 16,
    font: ctx.fonts.fraunces,
    color: COLOR_ACCENT,
  });
  page.drawLine({
    start: { x: MARGIN_X, y: PAGE_HEIGHT - MARGIN_TOP - 2 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - MARGIN_TOP - 2 },
    thickness: 0.5,
    color: COLOR_RULE,
  });
}

function drawText(ctx, text, opts) {
  const { font, size, color = COLOR_TEXT } = opts;
  ctx.currentPage.drawText(String(text || ""), {
    x: MARGIN_X, y: ctx.cursorY, size, font, color,
  });
  ctx.cursorY -= size * 1.4;
  if (ctx.cursorY < CONTENT_BOTTOM) newPage(ctx);
}

function drawWrappedText(ctx, text, opts) {
  const { font, size, color = COLOR_TEXT } = opts;
  const maxWidth = PAGE_WIDTH - 2 * MARGIN_X;
  const words = String(text || "").split(/\s+/);
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    const w = font.widthOfTextAtSize(test, size);
    if (w > maxWidth && line) {
      ctx.currentPage.drawText(line, { x: MARGIN_X, y: ctx.cursorY, size, font, color });
      ctx.cursorY -= size * 1.4;
      if (ctx.cursorY < CONTENT_BOTTOM) newPage(ctx);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.currentPage.drawText(line, { x: MARGIN_X, y: ctx.cursorY, size, font, color });
    ctx.cursorY -= size * 1.4;
    if (ctx.cursorY < CONTENT_BOTTOM) newPage(ctx);
  }
}

function drawKeyValue(ctx, key, value) {
  const { regular, semibold } = ctx.fonts;
  ctx.currentPage.drawText(key + ":", {
    x: MARGIN_X, y: ctx.cursorY, size: 9, font: semibold, color: COLOR_MUTED,
  });
  ctx.cursorY -= 11;
  ctx.currentPage.drawText(String(value), {
    x: MARGIN_X + 12, y: ctx.cursorY, size: 8, font: regular, color: COLOR_TEXT,
  });
  ctx.cursorY -= 14;
  if (ctx.cursorY < CONTENT_BOTTOM) newPage(ctx);
}

function drawHorizontalRule(ctx) {
  ctx.currentPage.drawLine({
    start: { x: MARGIN_X, y: ctx.cursorY },
    end: { x: PAGE_WIDTH - MARGIN_X, y: ctx.cursorY },
    thickness: 0.5,
    color: COLOR_RULE,
  });
  ctx.cursorY -= 4;
}

function drawFooter(page, fonts, pageNum, totalPages, envelopeId) {
  const text = `Page ${pageNum} of ${totalPages}  ·  Envelope ${String(envelopeId).slice(0, 8)}`;
  page.drawText(text, {
    x: MARGIN_X, y: MARGIN_BOTTOM - 4, size: 8,
    font: fonts.regular, color: COLOR_MUTED,
  });
}

function formatTimestamp(iso) {
  if (!iso) return "(unknown)";
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}
