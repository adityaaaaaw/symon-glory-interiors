/**
 * Glory Simon Interiors - Site Visit Booking System
 * PDF Generator — PDFKit
 *
 * Generates a beautifully formatted Site Visit Report PDF with:
 *   - Branded header (Glory Simon Interiors gold/dark theme)
 *   - Client & booking details
 *   - Room measurements table
 *   - Observations, design & material suggestions
 *   - Budget estimate
 *   - Professional summary
 *   - Follow-up notes
 *   - Page numbers & timestamp footer
 *
 * Usage:
 *   const { generateReportPDF } = require('../utils/pdfGenerator');
 *   const result = await generateReportPDF(reportData, '/path/to/output.pdf');
 *   // result → { success: true, filePath: '/path/to/output.pdf' }
 */

'use strict';

const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');

// ─── Brand palette ────────────────────────────────────────────────────────────
const COLORS = {
  gold     : '#C9A84C',
  goldDark : '#A8823A',
  dark     : '#1A1209',
  darkMid  : '#2D1F0A',
  brown    : '#4A3728',
  cream    : '#FDF8EE',
  lightBg  : '#F5EDD6',
  line     : '#E8DCC8',
  muted    : '#7A6248',
  white    : '#FFFFFF',
  green    : '#2E7D32',
  tableHdr : '#2D1F0A',
};

// ─── Typography ───────────────────────────────────────────────────────────────
const FONTS = {
  // PDFKit ships with Helvetica & Times-Roman as built-in fonts
  serif    : 'Times-Roman',
  serifBold: 'Times-Bold',
  sans     : 'Helvetica',
  sansBold : 'Helvetica-Bold',
  mono     : 'Courier',
};

// ─── Page layout ──────────────────────────────────────────────────────────────
const MARGIN      = 50;
const PAGE_WIDTH  = 595.28;   // A4 portrait
const PAGE_HEIGHT = 841.89;
const CONTENT_W   = PAGE_WIDTH - MARGIN * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a number as Indian Rupee.
 */
function formatINR(amount) {
  const n = parseFloat(amount);
  if (isNaN(n) || n === 0) return 'To be quoted';
  return new Intl.NumberFormat('en-IN', {
    style                : 'currency',
    currency             : 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Format a Date or ISO string as "DD Month YYYY".
 */
function formatDate(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-IN', {
    day     : '2-digit',
    month   : 'long',
    year    : 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Wrap long text for PDFKit, returning it chunked to prevent overflow.
 * (PDFKit handles wrapping automatically via options.width, but this helper
 *  sanitises content before passing it.)
 */
function safe(text) {
  if (text === null || text === undefined) return '—';
  return String(text).trim() || '—';
}

// ─── PDF section helpers ──────────────────────────────────────────────────────

/**
 * Draw a full-width horizontal rule.
 */
function drawHRule(doc, y, color = COLORS.line, thickness = 0.5) {
  doc.save()
     .strokeColor(color)
     .lineWidth(thickness)
     .moveTo(MARGIN, y)
     .lineTo(PAGE_WIDTH - MARGIN, y)
     .stroke()
     .restore();
}

/**
 * Draw a section heading with gold left accent bar.
 * Returns the Y position after the heading.
 */
function drawSectionHeading(doc, title, y) {
  // Accent bar
  doc.save()
     .fillColor(COLORS.gold)
     .rect(MARGIN, y, 4, 20)
     .fill()
     .restore();

  doc.font(FONTS.serifBold)
     .fontSize(13)
     .fillColor(COLORS.dark)
     .text(title, MARGIN + 12, y + 2, { width: CONTENT_W - 12 });

  const newY = y + 28;
  drawHRule(doc, newY, COLORS.line);
  return newY + 8;
}

/**
 * Draw a key/value detail row.
 * Returns the Y position after the row.
 */
function drawDetailRow(doc, label, value, y, labelColor = COLORS.muted) {
  const labelW = 160;
  const valueX = MARGIN + labelW + 8;
  const valueW = CONTENT_W - labelW - 8;

  doc.font(FONTS.sansBold)
     .fontSize(9.5)
     .fillColor(labelColor)
     .text(label, MARGIN, y, { width: labelW });

  doc.font(FONTS.sans)
     .fontSize(9.5)
     .fillColor(COLORS.brown)
     .text(safe(value), valueX, y, { width: valueW });

  // Calculate height of value text for variable-length content
  const valueHeight = doc.heightOfString(safe(value), { width: valueW, font: FONTS.sans, fontSize: 9.5 });
  return y + Math.max(16, valueHeight + 4);
}

/**
 * Draw a shaded info box (card-style background).
 * Returns the Y position after the box.
 */
function drawInfoBox(doc, lines, y, bgColor = COLORS.cream) {
  const padding = 10;
  let textHeight = 0;
  lines.forEach((line) => {
    textHeight += doc.heightOfString(line.text || '—', { width: CONTENT_W - padding * 2, font: line.bold ? FONTS.sansBold : FONTS.sans, fontSize: 9.5 }) + 4;
  });

  const boxH = textHeight + padding * 2;

  doc.save()
     .fillColor(bgColor)
     .roundedRect(MARGIN, y, CONTENT_W, boxH, 4)
     .fill()
     .restore();

  let textY = y + padding;
  lines.forEach((line) => {
    doc.font(line.bold ? FONTS.sansBold : FONTS.sans)
       .fontSize(9.5)
       .fillColor(line.color || COLORS.brown)
       .text(line.text || '—', MARGIN + padding, textY, { width: CONTENT_W - padding * 2 });

    const h = doc.heightOfString(line.text || '—', { width: CONTENT_W - padding * 2 }) + 4;
    textY += h;
  });

  return y + boxH + 8;
}

/**
 * Draw a body paragraph. Returns Y after paragraph.
 */
function drawParagraph(doc, text, y, options = {}) {
  const {
    font     = FONTS.sans,
    fontSize = 9.5,
    color    = COLORS.brown,
    width    = CONTENT_W,
    indent   = 0,
  } = options;

  if (!text || String(text).trim() === '') return y;

  doc.font(font)
     .fontSize(fontSize)
     .fillColor(color)
     .text(safe(text), MARGIN + indent, y, { width: width - indent, align: 'justify' });

  return y + doc.heightOfString(safe(text), { width: width - indent }) + 10;
}

/**
 * Check if we need a new page and add one if so.
 * Returns the current Y (either original or top of new page).
 */
function checkPageBreak(doc, y, neededHeight = 60) {
  if (y + neededHeight > PAGE_HEIGHT - 80) {
    doc.addPage();
    return MARGIN + 20;
  }
  return y;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: generateReportPDF
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Generate a Site Visit Report PDF.
 *
 * @param {{
 *   booking_ref: string,
 *   client_name: string,
 *   client_mobile: string,
 *   client_email: string,
 *   visit_date: string|Date,
 *   property_type: string,
 *   project_type: string,
 *   address: string,
 *   city: string,
 *   visit_report: {
 *     observations: string,
 *     design_suggestions: string,
 *     material_suggestions: string,
 *     budget_estimate: number|string,
 *     summary: string,
 *     follow_up_notes: string,
 *   },
 *   measurements: Array<{
 *     room_name: string,
 *     length_ft: number,
 *     width_ft: number,
 *     height_ft: number,
 *     area_sqft: number,
 *   }>,
 *   designer_name: string,
 *   engineer_name: string,
 * }} reportData
 * @param {string} outputPath  - Absolute path for the output PDF file
 * @returns {Promise<{ success: boolean, filePath: string, error?: string }>}
 */
async function generateReportPDF(reportData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // ── Validate inputs ────────────────────────────────────────────────────
      if (!reportData || typeof reportData !== 'object') {
        return resolve({ success: false, filePath: '', error: 'Invalid reportData: must be an object' });
      }
      if (!outputPath || typeof outputPath !== 'string') {
        return resolve({ success: false, filePath: '', error: 'Invalid outputPath: must be a string' });
      }

      // ── Ensure output directory exists ────────────────────────────────────
      ensureDir(outputPath);

      // ── Destructure data with defaults ────────────────────────────────────
      const {
        booking_ref   = '—',
        client_name   = '—',
        client_mobile = '—',
        client_email  = '—',
        visit_date    = null,
        property_type = '—',
        project_type  = '—',
        address       = '—',
        city          = '—',
        designer_name = '—',
        engineer_name = '—',
        visit_report  = {},
        measurements  = [],
      } = reportData;

      const {
        observations         = '',
        design_suggestions   = '',
        material_suggestions = '',
        budget_estimate      = 0,
        summary              = '',
        follow_up_notes      = '',
      } = visit_report;

      const formattedDate   = formatDate(visit_date);
      const generatedAt     = new Date().toLocaleString('en-IN', {
        day    : '2-digit', month  : 'long', year    : 'numeric',
        hour   : '2-digit', minute : '2-digit', hour12 : true,
        timeZone: 'Asia/Kolkata',
      });

      // Calculate total area
      const totalArea = measurements.reduce((sum, m) => {
        return sum + (parseFloat(m.area_sqft) || parseFloat(m.length_ft || 0) * parseFloat(m.width_ft || 0));
      }, 0);

      // ── Create PDF document ───────────────────────────────────────────────
      const doc = new PDFDocument({
        size    : 'A4',
        margins : { top: 0, bottom: 0, left: 0, right: 0 },
        info    : {
          Title   : `Site Visit Report — ${booking_ref}`,
          Author  : 'Glory Simon Interiors',
          Subject : 'Interior Design Site Visit Report',
          Keywords: 'site visit, interior design, glory simon interiors',
          Creator : 'Glory Simon Interiors — Booking System',
        },
        bufferPages: true,
      });

      // ── Pipe to file ──────────────────────────────────────────────────────
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      writeStream.on('error', (err) => {
        resolve({ success: false, filePath: outputPath, error: err.message });
      });

      // ─────────────────────────────────────────────────────────────────────
      // PAGE 1: HEADER
      // ─────────────────────────────────────────────────────────────────────

      // Full-width dark header background
      doc.save()
         .fillColor(COLORS.dark)
         .rect(0, 0, PAGE_WIDTH, 130)
         .fill()
         .restore();

      // Gold top accent stripe
      doc.save()
         .fillColor(COLORS.gold)
         .rect(0, 0, PAGE_WIDTH, 5)
         .fill()
         .restore();

      // Gold bottom header line
      doc.save()
         .fillColor(COLORS.gold)
         .rect(0, 125, PAGE_WIDTH, 2)
         .fill()
         .restore();

      // Company logo gem symbol
      doc.font(FONTS.serif)
         .fontSize(22)
         .fillColor(COLORS.gold)
         .text('✦', MARGIN, 18, { align: 'left' });

      // Company name
      doc.font(FONTS.serifBold)
         .fontSize(22)
         .fillColor(COLORS.gold)
         .text('GLORY SIMON INTERIORS', MARGIN + 32, 20, { width: CONTENT_W - 32 });

      // Tagline
      doc.font(FONTS.serif)
         .fontSize(9)
         .fillColor('#BEA06A')
         .text('Transforming Spaces, Enriching Lives', MARGIN + 32, 46, { width: CONTENT_W - 32, characterSpacing: 1.5 });

      // Booking reference badge (right-aligned header)
      doc.font(FONTS.sansBold)
         .fontSize(8)
         .fillColor('#8A7A62')
         .text('BOOKING REFERENCE', PAGE_WIDTH - MARGIN - 140, 16, { width: 140, align: 'right' });

      doc.font(FONTS.sansBold)
         .fontSize(13)
         .fillColor(COLORS.gold)
         .text(booking_ref, PAGE_WIDTH - MARGIN - 140, 30, { width: 140, align: 'right', characterSpacing: 1 });

      // Report type label
      doc.font(FONTS.serifBold)
         .fontSize(14)
         .fillColor(COLORS.white)
         .text('SITE VISIT REPORT', MARGIN, 78, { width: CONTENT_W });

      doc.font(FONTS.sans)
         .fontSize(9)
         .fillColor('#BEA06A')
         .text(`Generated: ${generatedAt}`, MARGIN, 98, { width: CONTENT_W });

      // ─────────────────────────────────────────────────────────────────────
      // Main content starts below header
      // ─────────────────────────────────────────────────────────────────────

      let y = 148;

      // ── Section 1: Client Details ─────────────────────────────────────────
      y = drawSectionHeading(doc, 'CLIENT DETAILS', y);

      // Two-column layout for client details
      const col1X = MARGIN;
      const col2X = MARGIN + CONTENT_W / 2 + 10;
      const colW  = CONTENT_W / 2 - 10;

      // Left column
      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('Client Name',  col1X, y, { width: 90 });
      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.brown)
         .text(safe(client_name), col1X + 95, y, { width: colW - 95 });

      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('Mobile',  col1X, y + 16, { width: 90 });
      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.brown)
         .text(safe(client_mobile), col1X + 95, y + 16, { width: colW - 95 });

      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('Email',  col1X, y + 32, { width: 90 });
      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.brown)
         .text(safe(client_email), col1X + 95, y + 32, { width: colW - 95 });

      // Right column
      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('Property Type', col2X, y, { width: 90 });
      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.brown)
         .text(safe(property_type), col2X + 95, y, { width: colW - 95 });

      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('Project Type', col2X, y + 16, { width: 90 });
      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.brown)
         .text(safe(project_type), col2X + 95, y + 16, { width: colW - 95 });

      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('City', col2X, y + 32, { width: 90 });
      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.brown)
         .text(safe(city), col2X + 95, y + 32, { width: colW - 95 });

      y += 52;

      // Address (full width)
      y = drawDetailRow(doc, 'Site Address', address, y);

      y += 8;
      drawHRule(doc, y, COLORS.line, 0.3);
      y += 14;

      // ── Section 2: Visit Details ──────────────────────────────────────────
      y = checkPageBreak(doc, y, 80);
      y = drawSectionHeading(doc, 'VISIT DETAILS', y);

      // Left column
      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('Visit Date',   col1X, y, { width: 90 });
      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.dark)
         .text(formattedDate, col1X + 95, y, { width: colW - 95 });

      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('Lead Designer', col1X, y + 16, { width: 90 });
      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.brown)
         .text(safe(designer_name), col1X + 95, y + 16, { width: colW - 95 });

      // Right column
      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('Site Engineer', col2X, y, { width: 90 });
      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.brown)
         .text(safe(engineer_name), col2X + 95, y, { width: colW - 95 });

      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('Total Area',   col2X, y + 16, { width: 90 });
      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.brown)
         .text(totalArea > 0 ? `${totalArea.toFixed(1)} sq.ft` : '—', col2X + 95, y + 16, { width: colW - 95 });

      y += 40;
      drawHRule(doc, y, COLORS.line, 0.3);
      y += 14;

      // ── Section 3: Room Measurements Table ────────────────────────────────
      y = checkPageBreak(doc, y, 100);
      y = drawSectionHeading(doc, 'ROOM MEASUREMENTS', y);

      if (measurements.length > 0) {
        // Table header
        const colWidths = [160, 65, 65, 65, 80];
        const colLabels = ['Room / Space', 'Length (ft)', 'Width (ft)', 'Height (ft)', 'Area (sq.ft)'];
        const colXs     = [MARGIN];
        colWidths.slice(0, -1).forEach((w, i) => colXs.push(colXs[i] + w));

        const headerH = 22;

        // Header background
        doc.save()
           .fillColor(COLORS.tableHdr)
           .rect(MARGIN, y, CONTENT_W, headerH)
           .fill()
           .restore();

        colLabels.forEach((label, i) => {
          doc.font(FONTS.sansBold)
             .fontSize(8.5)
             .fillColor(COLORS.gold)
             .text(label, colXs[i] + 4, y + 6, { width: colWidths[i] - 8, align: i === 0 ? 'left' : 'center' });
        });

        y += headerH;

        // Table rows
        measurements.forEach((m, idx) => {
          y = checkPageBreak(doc, y, 20);

          const rowH  = 18;
          const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.cream;

          doc.save()
             .fillColor(rowBg)
             .rect(MARGIN, y, CONTENT_W, rowH)
             .fill()
             .restore();

          const areaValue = parseFloat(m.area_sqft) ||
                            (parseFloat(m.length_ft || 0) * parseFloat(m.width_ft || 0));

          const rowValues = [
            safe(m.room_name),
            m.length_ft ? String(parseFloat(m.length_ft).toFixed(1)) : '—',
            m.width_ft  ? String(parseFloat(m.width_ft).toFixed(1))  : '—',
            m.height_ft ? String(parseFloat(m.height_ft).toFixed(1)) : '—',
            areaValue   ? areaValue.toFixed(1) : '—',
          ];

          rowValues.forEach((val, i) => {
            doc.font(i === 0 ? FONTS.sansBold : FONTS.sans)
               .fontSize(8.5)
               .fillColor(COLORS.brown)
               .text(val, colXs[i] + 4, y + 5, { width: colWidths[i] - 8, align: i === 0 ? 'left' : 'center' });
          });

          // Row border
          doc.save()
             .strokeColor(COLORS.line)
             .lineWidth(0.3)
             .moveTo(MARGIN, y + rowH)
             .lineTo(PAGE_WIDTH - MARGIN, y + rowH)
             .stroke()
             .restore();

          y += rowH;
        });

        // Totals row
        const totalsH = 22;
        doc.save()
           .fillColor(COLORS.darkMid)
           .rect(MARGIN, y, CONTENT_W, totalsH)
           .fill()
           .restore();

        doc.font(FONTS.sansBold).fontSize(8.5).fillColor(COLORS.gold)
           .text(`TOTAL (${measurements.length} Spaces)`, MARGIN + 4, y + 7, { width: colWidths[0] - 8 });

        doc.font(FONTS.sansBold).fontSize(8.5).fillColor(COLORS.gold)
           .text(`${totalArea.toFixed(1)} sq.ft`, colXs[4] + 4, y + 7, { width: colWidths[4] - 8, align: 'center' });

        y += totalsH + 14;
      } else {
        doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.muted)
           .text('No measurement data recorded.', MARGIN, y);
        y += 20;
      }

      drawHRule(doc, y, COLORS.line, 0.3);
      y += 14;

      // ── Section 4: Site Observations ─────────────────────────────────────
      y = checkPageBreak(doc, y, 80);
      y = drawSectionHeading(doc, 'SITE OBSERVATIONS', y);

      if (observations && observations.trim()) {
        y = drawParagraph(doc, observations, y);
      } else {
        doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.muted).italic()
           .text('No observations recorded.', MARGIN, y);
        y += 20;
      }

      drawHRule(doc, y, COLORS.line, 0.3);
      y += 14;

      // ── Section 5: Design Suggestions ────────────────────────────────────
      y = checkPageBreak(doc, y, 80);
      y = drawSectionHeading(doc, 'DESIGN SUGGESTIONS', y);

      if (design_suggestions && design_suggestions.trim()) {
        y = drawParagraph(doc, design_suggestions, y);
      } else {
        doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.muted).italic()
           .text('No design suggestions recorded.', MARGIN, y);
        y += 20;
      }

      drawHRule(doc, y, COLORS.line, 0.3);
      y += 14;

      // ── Section 6: Material Suggestions ──────────────────────────────────
      y = checkPageBreak(doc, y, 80);
      y = drawSectionHeading(doc, 'MATERIAL & FINISH RECOMMENDATIONS', y);

      if (material_suggestions && material_suggestions.trim()) {
        y = drawParagraph(doc, material_suggestions, y);
      } else {
        doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.muted).italic()
           .text('No material recommendations recorded.', MARGIN, y);
        y += 20;
      }

      drawHRule(doc, y, COLORS.line, 0.3);
      y += 14;

      // ── Section 7: Budget Estimate ────────────────────────────────────────
      y = checkPageBreak(doc, y, 70);
      y = drawSectionHeading(doc, 'BUDGET ESTIMATE', y);

      // Budget highlight box
      const budgetFormatted = formatINR(budget_estimate);
      doc.save()
         .fillColor(COLORS.lightBg)
         .roundedRect(MARGIN, y, CONTENT_W, 40, 4)
         .fill()
         .strokeColor(COLORS.gold)
         .lineWidth(1)
         .roundedRect(MARGIN, y, CONTENT_W, 40, 4)
         .stroke()
         .restore();

      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.muted)
         .text('PRELIMINARY ESTIMATE', MARGIN + 12, y + 10, { width: 180 });

      doc.font(FONTS.serifBold).fontSize(18).fillColor(COLORS.goldDark)
         .text(budgetFormatted, MARGIN + 180, y + 8, { width: CONTENT_W - 192, align: 'right' });

      y += 50;

      doc.font(FONTS.sans).fontSize(8).fillColor(COLORS.muted).italic()
         .text('* This is a preliminary estimate based on the site visit. Final quotation will be provided after design concept approval.', MARGIN, y, { width: CONTENT_W });

      y += 24;
      drawHRule(doc, y, COLORS.line, 0.3);
      y += 14;

      // ── Section 8: Professional Summary ──────────────────────────────────
      y = checkPageBreak(doc, y, 80);
      y = drawSectionHeading(doc, 'PROFESSIONAL SUMMARY', y);

      if (summary && summary.trim()) {
        // Render summary preserving paragraphs
        const summaryParagraphs = summary.split('\n\n').filter(Boolean);
        for (const para of summaryParagraphs) {
          y = checkPageBreak(doc, y, 40);
          y = drawParagraph(doc, para, y);
          y += 4;
        }
      } else {
        doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.muted).italic()
           .text('No professional summary recorded.', MARGIN, y);
        y += 20;
      }

      drawHRule(doc, y, COLORS.line, 0.3);
      y += 14;

      // ── Section 9: Follow-up Notes ────────────────────────────────────────
      y = checkPageBreak(doc, y, 80);
      y = drawSectionHeading(doc, 'FOLLOW-UP NOTES & NEXT STEPS', y);

      if (follow_up_notes && follow_up_notes.trim()) {
        y = drawParagraph(doc, follow_up_notes, y);
      } else {
        doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.muted).italic()
           .text('No follow-up notes recorded.', MARGIN, y);
        y += 20;
      }

      y += 12;
      drawHRule(doc, y, COLORS.gold, 1);
      y += 18;

      // ── Declaration / Sign-off ────────────────────────────────────────────
      y = checkPageBreak(doc, y, 70);

      doc.font(FONTS.sans).fontSize(9).fillColor(COLORS.muted)
         .text(
           'This report was prepared by the assigned Glory Simon Interiors team member based on direct site observation. ' +
           'All measurements are approximate and subject to verification during the execution phase. ' +
           'Design suggestions are preliminary and will be refined in the formal design proposal.',
           MARGIN, y, { width: CONTENT_W, align: 'justify' }
         );

      y += 40;

      // Signature lines
      const sig1X = MARGIN;
      const sig2X = MARGIN + CONTENT_W / 2 + 20;

      drawHRule(doc, y, COLORS.muted, 0.5);

      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.dark)
         .text(`Prepared By: ${safe(designer_name)}`, sig1X, y + 6, { width: CONTENT_W / 2 - 10 });

      drawHRule(doc, y, COLORS.muted, 0.5); // reuse same line y
      doc.font(FONTS.sansBold).fontSize(9).fillColor(COLORS.dark)
         .text(`Reviewed By: Admin`, sig2X, y + 6, { width: CONTENT_W / 2 - 20 });

      y += 28;

      doc.font(FONTS.sans).fontSize(8).fillColor(COLORS.muted)
         .text('Lead Designer / Site Engineer', sig1X, y, { width: CONTENT_W / 2 - 10 });
      doc.font(FONTS.sans).fontSize(8).fillColor(COLORS.muted)
         .text('Glory Simon Interiors', sig2X, y, { width: CONTENT_W / 2 - 20 });

      // ─────────────────────────────────────────────────────────────────────
      // FOOTER — applied to ALL pages using buffered pages
      // ─────────────────────────────────────────────────────────────────────
      const pageCount = doc.bufferedPageRange().count;

      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        // Footer background
        doc.save()
           .fillColor(COLORS.dark)
           .rect(0, PAGE_HEIGHT - 45, PAGE_WIDTH, 45)
           .fill()
           .restore();

        // Gold top line of footer
        doc.save()
           .fillColor(COLORS.gold)
           .rect(0, PAGE_HEIGHT - 46, PAGE_WIDTH, 1.5)
           .fill()
           .restore();

        // Left: company name
        doc.font(FONTS.serifBold)
           .fontSize(9)
           .fillColor(COLORS.gold)
           .text('GLORY SIMON INTERIORS', MARGIN, PAGE_HEIGHT - 33, { width: 200 });

        // Centre: report ref
        doc.font(FONTS.sans)
           .fontSize(8)
           .fillColor('#8A7A62')
           .text(`Report: ${booking_ref}`, 0, PAGE_HEIGHT - 33, { width: PAGE_WIDTH, align: 'center' });

        // Right: page number
        doc.font(FONTS.sans)
           .fontSize(8)
           .fillColor('#8A7A62')
           .text(`Page ${i + 1} of ${pageCount}`, PAGE_WIDTH - MARGIN - 80, PAGE_HEIGHT - 33, { width: 80, align: 'right' });

        // Bottom line
        doc.font(FONTS.sans)
           .fontSize(7)
           .fillColor('#5A4A36')
           .text(
             `Confidential — ${new Date().getFullYear()} Glory Simon Interiors. All rights reserved.`,
             0, PAGE_HEIGHT - 18, { width: PAGE_WIDTH, align: 'center' }
           );
      }

      // ── Finalise ──────────────────────────────────────────────────────────
      doc.end();

      writeStream.on('finish', () => {
        console.log(`✅ PDF generated: ${outputPath}`);
        resolve({ success: true, filePath: outputPath });
      });

    } catch (err) {
      console.error('❌ PDF generation failed:', err.message, err.stack);
      resolve({ success: false, filePath: outputPath || '', error: err.message });
    }
  });
}

// ─── Module exports ───────────────────────────────────────────────────────────
module.exports = {
  generateReportPDF,
  // Expose helpers for testing
  _formatINR  : formatINR,
  _formatDate : formatDate,
  _ensureDir  : ensureDir,
};
