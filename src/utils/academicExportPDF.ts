import jsPDF from 'jspdf';
import { sanitizeFilename, parseMarkdownToSections } from './exportHelpers';
import { extractCitationNumbers, generateMockCitations, formatCitation } from './citationFormatter';
import { shouldUseTwoColumn, getMargins, getColumnConfig } from './formatHelpers';
import type { AcademicReportConfig } from '@/types/academicReport';
import type { ExtractedData } from './regexProcessor';

export const exportToAcademicPDF = async (
  title: string,
  content: string,
  config: AcademicReportConfig,
  extractedData: ExtractedData[]
): Promise<void> => {
  const { academicDetails, structure } = config;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;
  let currentPage = 1;
  let sectionNumber = 0;
  let subsectionNumber = 0;

  const LINE_HEIGHT = 5.5;
  const PARAGRAPH_SPACING = 3;
  const BOTTOM_MARGIN = margin + 15;

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - BOTTOM_MARGIN) {
      pdf.addPage();
      currentPage++;
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper to strip existing section numbering from headings
  const stripExistingNumbering = (text: string): string => {
    return text
      .replace(/^[\d.]+\s*/, '')
      .replace(/^SECTION\s*\d+[:.]\s*/i, '')
      .replace(/^CHAPTER\s*\d+[:.]\s*/i, '')
      .trim();
  };

  // Strip bold/italic markdown markers from text
  const stripFormatting = (text: string): string => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
  };

  // Parse text into segments with bold/italic flags
  const parseFormattedSegments = (text: string): { text: string; bold: boolean; italic: boolean }[] => {
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

    return segments;
  };

  // Render a paragraph with inline bold/italic, proper line wrapping
  const renderFormattedParagraph = (
    text: string,
    startX: number,
    maxWidth: number,
    fontSize: number = 11,
    indent: number = 10
  ): void => {
    const segments = parseFormattedSegments(text);
    pdf.setFontSize(fontSize);

    // Build a flat list of words with their formatting
    const words: { word: string; bold: boolean; italic: boolean }[] = [];
    segments.forEach(seg => {
      const segWords = seg.text.split(/(\s+)/);
      segWords.forEach(w => {
        if (w) words.push({ word: w, bold: seg.bold, italic: seg.italic });
      });
    });

    let currentX = startX + indent; // First line indented
    const leftMargin = startX;
    let isFirstLine = true;

    words.forEach(({ word, bold, italic }) => {
      if (bold) {
        pdf.setFont('times', 'bold');
      } else if (italic) {
        pdf.setFont('times', 'italic');
      } else {
        pdf.setFont('times', 'normal');
      }

      const wordWidth = pdf.getTextWidth(word);
      const lineEnd = leftMargin + maxWidth;

      // Check if word fits on current line
      if (currentX + wordWidth > lineEnd && currentX > leftMargin + (isFirstLine ? indent : 0)) {
        // Wrap to next line
        yPosition += LINE_HEIGHT;
        checkPageBreak(LINE_HEIGHT);
        currentX = leftMargin;
        isFirstLine = false;
      }

      pdf.text(word, currentX, yPosition);
      currentX += wordWidth;
    });

    // Reset font and advance position
    pdf.setFont('times', 'normal');
    yPosition += LINE_HEIGHT;
  };

  // Render plain text paragraph (no formatting, just text wrapping)
  const renderPlainParagraph = (
    text: string,
    startX: number,
    maxWidth: number,
    fontSize: number = 11,
    indent: number = 10
  ): void => {
    pdf.setFontSize(fontSize);
    pdf.setFont('times', 'normal');
    const lines = pdf.splitTextToSize(text, maxWidth - indent);

    if (lines.length > 0) {
      // First line with indent
      checkPageBreak(LINE_HEIGHT);
      pdf.text(lines[0], startX + indent, yPosition);
      yPosition += LINE_HEIGHT;

      // Remaining lines without indent
      for (let i = 1; i < lines.length; i++) {
        checkPageBreak(LINE_HEIGHT);
        pdf.text(lines[i], startX, yPosition);
        yPosition += LINE_HEIGHT;
      }
    }
  };

  // Render a table with proper cell sizing
  const renderTable = (rows: string[][], startX: number, tableWidth: number): void => {
    if (!rows || rows.length === 0) return;

    const colCount = rows[0].length;
    const colWidth = tableWidth / colCount;
    const cellPadding = 2;
    const cellFontSize = 9;

    pdf.setFontSize(cellFontSize);

    // Calculate row heights based on content
    const rowHeights = rows.map(row => {
      let maxLines = 1;
      row.forEach(cell => {
        const cleanCell = stripFormatting(cell);
        const lines = pdf.splitTextToSize(cleanCell, colWidth - cellPadding * 2);
        maxLines = Math.max(maxLines, lines.length);
      });
      return Math.max(8, maxLines * 4 + 4);
    });

    const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);
    checkPageBreak(totalHeight + 10);

    let currentRowY = yPosition;

    rows.forEach((row, rowIndex) => {
      const rowHeight = rowHeights[rowIndex];

      row.forEach((cell, colIndex) => {
        const x = startX + colIndex * colWidth;

        // Draw cell border
        pdf.setDrawColor(150, 150, 150);
        pdf.setLineWidth(0.3);
        pdf.rect(x, currentRowY, colWidth, rowHeight);

        // Header row styling
        if (rowIndex === 0) {
          pdf.setFillColor(230, 230, 230);
          pdf.rect(x, currentRowY, colWidth, rowHeight, 'F');
          // Redraw border on top of fill
          pdf.setDrawColor(150, 150, 150);
          pdf.rect(x, currentRowY, colWidth, rowHeight);
          pdf.setFont('times', 'bold');
        } else {
          pdf.setFont('times', 'normal');
        }

        pdf.setFontSize(cellFontSize);
        const cleanCell = stripFormatting(cell);
        const cellLines = pdf.splitTextToSize(cleanCell, colWidth - cellPadding * 2);

        // Render ALL lines of cell text
        cellLines.forEach((line: string, lineIdx: number) => {
          pdf.text(line, x + cellPadding, currentRowY + 4 + lineIdx * 4);
        });
      });

      currentRowY += rowHeight;
    });

    // Reset font and advance position
    pdf.setFont('times', 'normal');
    yPosition = currentRowY + 6;
  };

  // ============ TWO-COLUMN LAYOUT HELPER ============

  interface ColumnState {
    currentColumn: 'left' | 'right';
    leftY: number;
    rightY: number;
  }

  // Helper to render text in two-column mode
  const renderTextInColumn = (
    text: string,
    columnX: number,
    y: number,
    columnWidth: number,
    fontSize: number,
    isBold: boolean = false,
    isItalic: boolean = false
  ): number => {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont('times', 'bold');
    } else if (isItalic) {
      pdf.setFont('times', 'italic');
    } else {
      pdf.setFont('times', 'normal');
    }

    const lines = pdf.splitTextToSize(text, columnWidth);
    lines.forEach((line: string, index: number) => {
      pdf.text(line, columnX, y + (index * 6));
    });

    pdf.setFont('times', 'normal');
    return y + (lines.length * 6);
  };

  // Two-column page break check
  const checkTwoColumnPageBreak = (
    columnState: ColumnState,
    requiredSpace: number,
    columnWidth: number,
    leftX: number,
    rightX: number
  ): boolean => {
    const currentY = columnState.currentColumn === 'left' ? columnState.leftY : columnState.rightY;

    if (currentY + requiredSpace > pageHeight - BOTTOM_MARGIN) {
      if (columnState.currentColumn === 'left') {
        columnState.currentColumn = 'right';
        return false;
      } else {
        pdf.addPage();
        currentPage++;
        columnState.leftY = margin;
        columnState.rightY = margin;
        columnState.currentColumn = 'left';
        return true;
      }
    }
    return false;
  };

  const updateColumnY = (columnState: ColumnState, newY: number) => {
    if (columnState.currentColumn === 'left') {
      columnState.leftY = newY;
    } else {
      columnState.rightY = newY;
    }
  };

  const getCurrentColumnY = (columnState: ColumnState): number => {
    return columnState.currentColumn === 'left' ? columnState.leftY : columnState.rightY;
  };

  const getCurrentColumnX = (columnState: ColumnState, leftX: number, rightX: number): number => {
    return columnState.currentColumn === 'left' ? leftX : rightX;
  };

  // === COVER PAGE ===
  if (structure.includeCoverPage) {
    // Institution name
    if (academicDetails.institution) {
      pdf.setFontSize(16);
      pdf.setFont('times', 'bold');
      const instLines = pdf.splitTextToSize(academicDetails.institution.toUpperCase(), contentWidth);
      pdf.text(instLines, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += instLines.length * 7 + 5;
    }

    // Department
    if (academicDetails.department) {
      pdf.setFontSize(12);
      pdf.setFont('times', 'normal');
      pdf.text(academicDetails.department, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }

    // Move down for title
    yPosition = pageHeight * 0.35;

    // Report Title
    pdf.setFontSize(24);
    pdf.setFont('times', 'bold');
    const titleLines = pdf.splitTextToSize(title.toUpperCase(), contentWidth);
    pdf.text(titleLines, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += titleLines.length * 10 + 10;

    // Report Type
    const reportTypeLabel = config.reportType.replace(/-/g, ' ').toUpperCase();
    pdf.setFontSize(12);
    pdf.setFont('times', 'italic');
    pdf.text(`A ${reportTypeLabel}`, pageWidth / 2, yPosition, { align: 'center' });

    // Move down for author info
    yPosition = pageHeight * 0.65;

    // Author details
    if (academicDetails.authorName) {
      pdf.setFontSize(11);
      pdf.setFont('times', 'normal');
      pdf.text('Submitted by:', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      pdf.setFontSize(14);
      pdf.setFont('times', 'bold');
      pdf.text(academicDetails.authorName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      if (academicDetails.studentId) {
        pdf.setFontSize(11);
        pdf.setFont('times', 'normal');
        pdf.text(`ID: ${academicDetails.studentId}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 12;
      }
    }

    // Supervisor
    if (academicDetails.supervisorName) {
      yPosition += 5;
      pdf.setFontSize(11);
      pdf.setFont('times', 'normal');
      pdf.text('Under the guidance of:', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.setFont('times', 'bold');
      pdf.text(academicDetails.supervisorName, pageWidth / 2, yPosition, { align: 'center' });
    }

    // Date at bottom
    yPosition = pageHeight - 40;
    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');
    const dateStr = new Date(academicDetails.submissionDate).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    pdf.text(dateStr, pageWidth / 2, yPosition, { align: 'center' });

    // New page after cover
    pdf.addPage();
    currentPage++;
    yPosition = margin;
  }

  // === TABLE OF CONTENTS ===
  if (structure.includeToc) {
    const sections = parseMarkdownToSections(content);
    const tocEntries: { title: string; level: number; sectionNum: string }[] = [];
    let tempSectionNum = 0;
    let tempSubsectionNum = 0;

    // Helper to check if a heading is the report title (should be skipped)
    const isReportTitle = (headingText: string): boolean => {
      const cleanHeading = headingText.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();
      const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();
      // Match if heading contains the title or vice versa
      return cleanHeading.includes(cleanTitle) || cleanTitle.includes(cleanHeading) || 
             cleanHeading.length > 0 && cleanTitle.length > 0 && 
             (cleanHeading.startsWith(cleanTitle.substring(0, Math.min(30, cleanTitle.length))) ||
              cleanTitle.startsWith(cleanHeading.substring(0, Math.min(30, cleanHeading.length))));
    };

    sections.forEach((section) => {
      if (section.type === 'heading') {
        const cleanTitle = stripExistingNumbering(section.content);
        if (section.level === 1) {
          // Skip the report title heading — it's already on the cover page
          if (isReportTitle(cleanTitle)) return;

          tempSectionNum++;
          tempSubsectionNum = 0;
          tocEntries.push({
            title: cleanTitle.toUpperCase(),
            level: 1,
            sectionNum: `${tempSectionNum}.`
          });
        } else if (section.level === 2) {
          tempSubsectionNum++;
          tocEntries.push({
            title: cleanTitle,
            level: 2,
            sectionNum: `${tempSectionNum}.${tempSubsectionNum}`
          });
        }
      }
    });

    pdf.setFontSize(16);
    pdf.setFont('times', 'bold');
    pdf.text('TABLE OF CONTENTS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');

    const tocStartPage = currentPage + 1;
    const charsPerPage = 2500;

    tocEntries.forEach((entry) => {
      checkPageBreak(8);

      const sectionIndex = sections.findIndex(s =>
        s.type === 'heading' &&
        (stripExistingNumbering(s.content).toUpperCase() === entry.title ||
        stripExistingNumbering(s.content) === entry.title)
      );

      let sectionCharCount = 0;
      for (let i = 0; i < sectionIndex; i++) {
        sectionCharCount += sections[i].content?.length || 0;
      }
      const estimatedPage = tocStartPage + Math.floor(sectionCharCount / charsPerPage);

      const indent = entry.level === 1 ? 0 : 10;
      // Truncate long TOC entries to fit on the page
      const maxTocTextWidth = contentWidth - indent - 30; // Leave space for dots and page number
      let tocText = `${entry.sectionNum} ${entry.title}`;
      pdf.setFont('times', entry.level === 1 ? 'bold' : 'normal');
      while (pdf.getTextWidth(tocText) > maxTocTextWidth && tocText.length > 10) {
        tocText = tocText.substring(0, tocText.length - 4) + '...';
      }
      const pageNumText = `${estimatedPage}`;

      pdf.text(tocText, margin + indent, yPosition);

      pdf.setFont('times', 'normal');
      pdf.text(pageNumText, pageWidth - margin, yPosition, { align: 'right' });

      const textWidth = pdf.getTextWidth(tocText);
      const pageNumWidth = pdf.getTextWidth(pageNumText);
      const dotsStart = margin + indent + textWidth + 5;
      const dotsEnd = pageWidth - margin - pageNumWidth - 5;

      let dotX = dotsStart;
      while (dotX < dotsEnd) {
        pdf.text('.', dotX, yPosition);
        dotX += 3;
      }

      yPosition += 7;
    });

    pdf.addPage();
    currentPage++;
    yPosition = margin;
  }

  // === MAIN CONTENT ===
  const sections = parseMarkdownToSections(content);
  const useTwoColumn = shouldUseTwoColumn(config.reportType, structure.layout);

  // Helper to check if a heading is the report title (should be skipped in numbering)
  const isReportTitleHeading = (headingText: string): boolean => {
    const cleanHeading = headingText.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();
    const cleanTitleStr = title.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();
    if (!cleanHeading || !cleanTitleStr) return false;
    return cleanHeading.includes(cleanTitleStr) || cleanTitleStr.includes(cleanHeading) ||
           cleanHeading.startsWith(cleanTitleStr.substring(0, Math.min(30, cleanTitleStr.length))) ||
           cleanTitleStr.startsWith(cleanHeading.substring(0, Math.min(30, cleanHeading.length)));
  };

  if (useTwoColumn) {
    // ============ TWO-COLUMN LAYOUT (Research Papers) ============
    const margins = getMargins(config.reportType, structure.layout);
    const columnCfg = getColumnConfig(pageWidth, margins);
    const columnState: ColumnState = {
      currentColumn: 'left',
      leftY: yPosition,
      rightY: yPosition
    };

    // For research papers, render abstract full-width first if present
    if (structure.includeAbstract) {
      pdf.setFontSize(12);
      pdf.setFont('times', 'bold');
      pdf.text('ABSTRACT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('times', 'italic');
      const abstractText = '[Abstract content will appear here from AI-generated report]';
      const abstractLines = pdf.splitTextToSize(abstractText, contentWidth);
      abstractLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 10;

      columnState.leftY = yPosition;
      columnState.rightY = yPosition;
    }

    // Reset font for content
    pdf.setFont('times', 'normal');

    // Render content in two columns
    sections.forEach((section) => {
      switch (section.type) {
        case 'heading':
          if (section.level === 1) {
            const cleanH1Check = stripExistingNumbering(section.content);
            // Skip the report title heading
            if (isReportTitleHeading(cleanH1Check)) break;

            sectionNumber++;
            subsectionNumber = 0;

            checkTwoColumnPageBreak(columnState, 15, columnCfg.columnWidth, columnCfg.leftColumnX, columnCfg.rightColumnX);

            const h1Y = getCurrentColumnY(columnState);
            const h1X = getCurrentColumnX(columnState, columnCfg.leftColumnX, columnCfg.rightColumnX);

            const cleanH1 = stripExistingNumbering(section.content);
            const headingText = `${sectionNumber}. ${cleanH1.toUpperCase()}`;

            updateColumnY(columnState, h1Y + 8);
            const newY = renderTextInColumn(headingText, h1X, getCurrentColumnY(columnState), columnCfg.columnWidth, 12, true);
            updateColumnY(columnState, newY + 6);
          } else if (section.level === 2) {
            subsectionNumber++;

            checkTwoColumnPageBreak(columnState, 12, columnCfg.columnWidth, columnCfg.leftColumnX, columnCfg.rightColumnX);

            const h2Y = getCurrentColumnY(columnState);
            const h2X = getCurrentColumnX(columnState, columnCfg.leftColumnX, columnCfg.rightColumnX);

            const cleanH2 = stripExistingNumbering(section.content);
            const h2Text = `${sectionNumber}.${subsectionNumber} ${cleanH2}`;

            updateColumnY(columnState, h2Y + 5);
            const newY = renderTextInColumn(h2Text, h2X, getCurrentColumnY(columnState), columnCfg.columnWidth, 11, true);
            updateColumnY(columnState, newY + 4);
          }
          break;

        case 'paragraph':
          if (section.content.trim()) {
            checkTwoColumnPageBreak(columnState, 15, columnCfg.columnWidth, columnCfg.leftColumnX, columnCfg.rightColumnX);

            const pY = getCurrentColumnY(columnState);
            const pX = getCurrentColumnX(columnState, columnCfg.leftColumnX, columnCfg.rightColumnX);

            const cleanText = stripFormatting(section.content);
            const newY = renderTextInColumn(cleanText, pX, pY, columnCfg.columnWidth, 10);
            updateColumnY(columnState, newY + 4);
          }
          break;

        case 'list-item':
        case 'ordered-list-item':
          checkTwoColumnPageBreak(columnState, 10, columnCfg.columnWidth, columnCfg.leftColumnX, columnCfg.rightColumnX);

          const listY = getCurrentColumnY(columnState);
          const listX = getCurrentColumnX(columnState, columnCfg.leftColumnX, columnCfg.rightColumnX);

          pdf.setFontSize(10);
          pdf.setFont('times', 'normal');
          pdf.text('•', listX, listY);

          const cleanList = stripFormatting(section.content);
          const newY = renderTextInColumn(cleanList, listX + 5, listY, columnCfg.columnWidth - 5, 10);
          updateColumnY(columnState, newY + 2);
          break;

        case 'table':
          // Tables in two-column mode: render full-width across both columns
          if (section.rows && section.rows.length > 0) {
            const maxColY = Math.max(columnState.leftY, columnState.rightY);
            columnState.leftY = maxColY;
            columnState.rightY = maxColY;
            yPosition = maxColY;

            renderTable(section.rows, margin, contentWidth);

            columnState.leftY = yPosition;
            columnState.rightY = yPosition;
            columnState.currentColumn = 'left';
          }
          break;

        case 'space':
          updateColumnY(columnState, getCurrentColumnY(columnState) + 4);
          break;
      }
    });

  } else {
    // ============ SINGLE-COLUMN LAYOUT ============
    sections.forEach((section) => {
      switch (section.type) {
        case 'heading':
          if (section.level === 1) {
            const cleanH1Check = stripExistingNumbering(section.content);
            // Skip the report title heading — already on cover page
            if (isReportTitleHeading(cleanH1Check)) break;

            sectionNumber++;
            subsectionNumber = 0;

            checkPageBreak(20);
            yPosition += 6; // Space before heading

            pdf.setFontSize(14);
            pdf.setFont('times', 'bold');
            const cleanH1 = stripExistingNumbering(section.content);
            const headingText = `${sectionNumber}. ${cleanH1.toUpperCase()}`;
            const h1Lines = pdf.splitTextToSize(headingText, contentWidth);
            pdf.text(h1Lines, margin, yPosition);
            yPosition += h1Lines.length * 7;

            // Reset font immediately after heading
            pdf.setFont('times', 'normal');
            yPosition += 4; // Space after heading
          } else if (section.level === 2) {
            subsectionNumber++;

            checkPageBreak(15);
            yPosition += 4; // Space before heading

            pdf.setFontSize(12);
            pdf.setFont('times', 'bold');
            const cleanH2 = stripExistingNumbering(section.content);
            const h2Text = `${sectionNumber}.${subsectionNumber} ${cleanH2}`;
            const h2Lines = pdf.splitTextToSize(h2Text, contentWidth);
            pdf.text(h2Lines, margin, yPosition);
            yPosition += h2Lines.length * 6;

            // Reset font immediately after heading
            pdf.setFont('times', 'normal');
            yPosition += 3; // Space after heading
          } else {
            checkPageBreak(12);
            yPosition += 3; // Space before heading

            pdf.setFontSize(11);
            pdf.setFont('times', 'bold');
            const cleanH3 = stripExistingNumbering(section.content);
            const cleanHeading = stripFormatting(cleanH3);
            const h3Lines = pdf.splitTextToSize(cleanHeading, contentWidth);
            pdf.text(h3Lines, margin, yPosition);
            yPosition += h3Lines.length * 5;

            // Reset font immediately after heading
            pdf.setFont('times', 'normal');
            yPosition += 2; // Space after heading
          }
          break;

        case 'paragraph':
          if (section.content.trim()) {
            pdf.setFontSize(11);

            // Use formatted rendering if text has bold/italic markers
            if (section.content.includes('**') || section.content.includes('*')) {
              renderFormattedParagraph(section.content, margin, contentWidth, 11, 10);
            } else {
              renderPlainParagraph(section.content, margin, contentWidth, 11, 10);
            }

            yPosition += PARAGRAPH_SPACING;
          }
          break;

        case 'list-item':
        case 'ordered-list-item':
          checkPageBreak(8);
          pdf.setFontSize(11);
          pdf.setFont('times', 'normal');
          pdf.text('•', margin + 5, yPosition);
          const cleanListItem = stripFormatting(section.content);
          const listLines = pdf.splitTextToSize(cleanListItem, contentWidth - 15);
          listLines.forEach((line: string, idx: number) => {
            if (idx > 0) checkPageBreak(LINE_HEIGHT);
            pdf.text(line, margin + 12, yPosition);
            if (idx < listLines.length - 1) yPosition += LINE_HEIGHT;
          });
          yPosition += LINE_HEIGHT + 1;
          break;

        case 'table':
          if (section.rows && section.rows.length > 0) {
            renderTable(section.rows, margin, contentWidth);
          }
          break;

        case 'code':
          checkPageBreak(25);
          pdf.setFillColor(245, 245, 245);
          const codeLines = section.content.split('\n');
          const codeHeight = Math.max(15, codeLines.length * 4 + 8);
          pdf.rect(margin, yPosition - 3, contentWidth, codeHeight, 'F');
          pdf.setFont('courier', 'normal');
          pdf.setFontSize(9);
          codeLines.forEach((line, idx) => {
            pdf.text(line, margin + 3, yPosition + idx * 4);
          });
          pdf.setFont('times', 'normal'); // Reset font after code
          yPosition += codeHeight + 5;
          break;

        case 'space':
          yPosition += 3;
          break;
      }
    });
  }

  // === REFERENCES SECTION (Fallback) ===
  const hasAIReferences = /^#\s*(?:\d+\.?\s*)?REFERENCES/im.test(content);

  if (structure.includeReferences && structure.citationStyle !== 'none' && !hasAIReferences) {
    pdf.addPage();
    currentPage++;
    yPosition = margin;

    sectionNumber++;
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text(`${sectionNumber}. REFERENCES`, margin, yPosition);
    pdf.setFont('times', 'normal'); // Reset font
    yPosition += 15;

    const citationNumbers = extractCitationNumbers(content);

    if (citationNumbers.length > 0) {
      const mockCitations = generateMockCitations(citationNumbers);
      pdf.setFontSize(11);
      pdf.setFont('times', 'normal');

      mockCitations.forEach((citation, index) => {
        checkPageBreak(10);
        const formattedRef = `[${index + 1}] ${formatCitation(citation, structure.citationStyle)}`;
        const refLines = pdf.splitTextToSize(formattedRef, contentWidth - 15);

        pdf.text(`[${index + 1}]`, margin, yPosition);

        refLines.forEach((line: string, lineIdx: number) => {
          if (lineIdx === 0) {
            pdf.text(line, margin + 15, yPosition);
          } else {
            yPosition += 6;
            checkPageBreak(6);
            pdf.text(line, margin + 15, yPosition);
          }
        });
        yPosition += 10;
      });
    } else {
      pdf.setFontSize(11);
      pdf.setFont('times', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`No citations found in the document. Add citations using [1], [2], etc.`, margin, yPosition);
      pdf.setTextColor(0, 0, 0);
    }
  }

  // === ADD PAGE NUMBERS ===
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(100, 100, 100);

    // Page number at bottom center
    pdf.text(
      `${i}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );

    // Header with title (skip cover page)
    if (i > (structure.includeCoverPage ? 1 : 0)) {
      pdf.setFontSize(9);
      pdf.setFont('times', 'italic');
      const headerTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
      pdf.text(headerTitle, pageWidth - margin, 12, { align: 'right' });
    }
  }

  // Save the PDF
  const filename = `${sanitizeFilename(title)}_Academic.pdf`;
  pdf.save(filename);
};
