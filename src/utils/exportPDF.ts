import jsPDF from 'jspdf';
import { sanitizeFilename, formatDate, parseMarkdownToSections, createExtractedDataTable } from './exportHelpers';
import type { Template } from './templates';
import type { ExtractedData } from './regexProcessor';

export const exportToPDF = async (
  title: string,
  content: string,
  template: Template,
  extractedData: ExtractedData[]
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const LINE_HEIGHT = 5.5;
  const PARAGRAPH_SPACING = 4;
  const BOTTOM_MARGIN = margin + 10;

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - BOTTOM_MARGIN) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Strip bold/italic markdown markers
  const stripFormatting = (text: string): string => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
  };

  // Render a paragraph with inline bold/italic, proper line wrapping
  const renderFormattedParagraph = (text: string): void => {
    pdf.setFontSize(11);

    // Parse into segments
    const segments: { text: string; bold: boolean; italic: boolean }[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/);

      if (boldMatch && (!italicMatch || boldMatch.index! <= italicMatch.index!)) {
        if (boldMatch.index! > 0) {
          segments.push({ text: remaining.slice(0, boldMatch.index!), bold: false, italic: false });
        }
        segments.push({ text: boldMatch[1], bold: true, italic: false });
        remaining = remaining.slice(boldMatch.index! + boldMatch[0].length);
      } else if (italicMatch) {
        if (italicMatch.index! > 0) {
          segments.push({ text: remaining.slice(0, italicMatch.index!), bold: false, italic: false });
        }
        segments.push({ text: italicMatch[1], bold: false, italic: true });
        remaining = remaining.slice(italicMatch.index! + italicMatch[0].length);
      } else {
        segments.push({ text: remaining, bold: false, italic: false });
        break;
      }
    }

    // Build word list with formatting
    const words: { word: string; bold: boolean; italic: boolean }[] = [];
    segments.forEach(seg => {
      const segWords = seg.text.split(/(\s+)/);
      segWords.forEach(w => {
        if (w) words.push({ word: w, bold: seg.bold, italic: seg.italic });
      });
    });

    let currentX = margin;

    words.forEach(({ word, bold, italic }) => {
      if (bold) {
        pdf.setFont('helvetica', 'bold');
      } else if (italic) {
        pdf.setFont('helvetica', 'italic');
      } else {
        pdf.setFont('helvetica', 'normal');
      }

      const wordWidth = pdf.getTextWidth(word);

      if (currentX + wordWidth > margin + contentWidth && currentX > margin) {
        yPosition += LINE_HEIGHT;
        checkPageBreak(LINE_HEIGHT);
        currentX = margin;
      }

      pdf.text(word, currentX, yPosition);
      currentX += wordWidth;
    });

    pdf.setFont('helvetica', 'normal');
    yPosition += LINE_HEIGHT;
  };

  // Render table with dynamic row heights
  const renderTable = (rows: string[][]): void => {
    if (!rows || rows.length === 0) return;

    const colWidth = contentWidth / rows[0].length;
    const cellPadding = 2;
    const cellFontSize = 10;

    pdf.setFontSize(cellFontSize);

    // Calculate row heights based on content
    const rowHeights = rows.map(row => {
      let maxLines = 1;
      row.forEach(cell => {
        const cleanCell = stripFormatting(cell);
        const lines = pdf.splitTextToSize(cleanCell, colWidth - cellPadding * 2);
        maxLines = Math.max(maxLines, lines.length);
      });
      return Math.max(8, maxLines * 4.5 + 3);
    });

    const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);
    checkPageBreak(totalHeight + 10);

    let currentRowY = yPosition;

    rows.forEach((row, rowIndex) => {
      const rowHeight = rowHeights[rowIndex];

      row.forEach((cell, colIndex) => {
        const x = margin + colIndex * colWidth;

        // Header row
        if (rowIndex === 0) {
          pdf.setFillColor(240, 240, 240);
          pdf.rect(x, currentRowY, colWidth, rowHeight, 'F');
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }

        // Draw cell border
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, currentRowY, colWidth, rowHeight);

        // Render ALL cell text lines
        pdf.setFontSize(cellFontSize);
        const cleanCell = stripFormatting(cell);
        const cellLines = pdf.splitTextToSize(cleanCell, colWidth - cellPadding * 2);
        cellLines.forEach((line: string, lineIdx: number) => {
          pdf.text(line, x + cellPadding, currentRowY + 4.5 + lineIdx * 4.5);
        });
      });

      currentRowY += rowHeight;
    });

    pdf.setFont('helvetica', 'normal');
    yPosition = currentRowY + 8;
  };

  // Add header with title
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(title, contentWidth);
  pdf.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 10 + 5;

  // Add accent bar if template uses it
  if (template.styles.decoration.accentBar) {
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(2);
    pdf.line(margin, yPosition, margin + 30, yPosition);
    yPosition += 10;
  }

  // Add date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(formatDate(), margin, yPosition);
  yPosition += 15;

  // Parse and add content
  const sections = parseMarkdownToSections(content);
  pdf.setTextColor(0, 0, 0);

  sections.forEach((section) => {
    switch (section.type) {
      case 'heading':
        if (section.level === 1) {
          checkPageBreak(20);
          yPosition += 6;
          pdf.setFontSize(20);
          pdf.setFont('helvetica', 'bold');
        } else if (section.level === 2) {
          checkPageBreak(15);
          yPosition += 5;
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
        } else if (section.level === 3) {
          checkPageBreak(12);
          yPosition += 4;
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
        } else {
          checkPageBreak(10);
          yPosition += 3;
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
        }

        const cleanHeading = stripFormatting(section.content);
        const headingLines = pdf.splitTextToSize(cleanHeading, contentWidth);
        pdf.text(headingLines, margin, yPosition);
        yPosition += headingLines.length * 7;

        // Reset font immediately after heading
        pdf.setFont('helvetica', 'normal');
        yPosition += 3;
        
        if (template.styles.decoration.headingUnderline && section.level === 1) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.5);
          pdf.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
        }
        break;

      case 'paragraph':
        if (section.content.trim()) {
          if (section.content.includes('**') || section.content.includes('*')) {
            renderFormattedParagraph(section.content);
          } else {
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            const paraLines = pdf.splitTextToSize(section.content, contentWidth);
            paraLines.forEach((line: string) => {
              checkPageBreak(LINE_HEIGHT);
              pdf.text(line, margin, yPosition);
              yPosition += LINE_HEIGHT;
            });
          }
          yPosition += PARAGRAPH_SPACING;
        }
        break;

      case 'list-item':
      case 'ordered-list-item':
        checkPageBreak(8);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const bullet = section.type === 'ordered-list-item' ? '  ' : '•';
        pdf.text(bullet, margin, yPosition);
        const cleanList = stripFormatting(section.content);
        const listLines = pdf.splitTextToSize(cleanList, contentWidth - 8);
        listLines.forEach((line: string, idx: number) => {
          if (idx > 0) {
            yPosition += LINE_HEIGHT;
            checkPageBreak(LINE_HEIGHT);
          }
          pdf.text(line, margin + 8, yPosition);
        });
        yPosition += LINE_HEIGHT + 1;
        break;

      case 'table':
        if (section.rows && section.rows.length > 0) {
          renderTable(section.rows);
        }
        break;

      case 'code':
        checkPageBreak(30);
        pdf.setFillColor(245, 245, 245);
        const codeLines = section.content.split('\n');
        const codeHeight = Math.max(20, codeLines.length * 4 + 10);
        pdf.rect(margin, yPosition, contentWidth, codeHeight, 'F');
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(9);
        codeLines.forEach((line, idx) => {
          pdf.text(line, margin + 2, yPosition + 5 + idx * 4);
        });
        pdf.setFont('helvetica', 'normal'); // Reset font
        yPosition += codeHeight + 5;
        break;

      case 'space':
        yPosition += 4;
        break;
    }
  });

  // Add extracted data section
  if (extractedData.length > 0) {
    checkPageBreak(30);
    yPosition += 15;
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Extracted Data', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    yPosition += 10;

    const dataTable = createExtractedDataTable(extractedData);
    if (dataTable) {
      Object.entries(dataTable).forEach(([type, values]) => {
        checkPageBreak(20);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${type}:`, margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition += 7;

        pdf.setFontSize(10);
        values.forEach((value) => {
          checkPageBreak(8);
          pdf.text(`  • ${value}`, margin + 5, yPosition);
          yPosition += 6;
        });
        yPosition += 3;
      });
    }
  }

  // Add footer to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `${sanitizeFilename(title)}.pdf`;
  pdf.save(filename);
};
