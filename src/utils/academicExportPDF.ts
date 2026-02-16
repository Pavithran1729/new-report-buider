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

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin - 15) {
      pdf.addPage();
      currentPage++;
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper to strip existing section numbering from headings
  const stripExistingNumbering = (text: string): string => {
    // Remove patterns like "1. ", "1.1 ", "2.1.3 ", "SECTION 1:", etc.
    return text
      .replace(/^[\d.]+\s*/, '')
      .replace(/^SECTION\s*\d+[:.]\s*/i, '')
      .replace(/^CHAPTER\s*\d+[:.]\s*/i, '')
      .trim();
  };

  // Helper to render text with bold/italic formatting
  const renderFormattedText = (text: string, x: number, y: number, maxWidth: number): number => {
    const segments: { text: string; bold: boolean; italic: boolean }[] = [];
    let remaining = text;

    // Parse bold and italic markers
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const italicMatch = remaining.match(/\*(.*?)\*/);

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

    // Render segments
    let currentX = x;
    let currentY = y;
    const lineHeight = 6;

    segments.forEach(segment => {
      if (segment.bold) {
        pdf.setFont('times', 'bold');
      } else if (segment.italic) {
        pdf.setFont('times', 'italic');
      } else {
        pdf.setFont('times', 'normal');
      }

      const words = segment.text.split(' ');
      words.forEach((word, idx) => {
        const wordWithSpace = idx < words.length - 1 ? word + ' ' : word;
        const wordWidth = pdf.getTextWidth(wordWithSpace);

        if (currentX + wordWidth > x + maxWidth && currentX > x) {
          currentY += lineHeight;
          currentX = x;
          checkPageBreak(lineHeight);
        }

        pdf.text(wordWithSpace, currentX, currentY);
        currentX += wordWidth;
      });
    });

    pdf.setFont('times', 'normal');
    return currentY + lineHeight;
  };

  // Simple text style stripper for non-formatted output
  const processTextStyle = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
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

    if (currentY + requiredSpace > pageHeight - margin - 15) {
      if (columnState.currentColumn === 'left') {
        // Switch to right column
        columnState.currentColumn = 'right';
        return false;
      } else {
        // Both columns full, need new page
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

  // Update the current column Y position
  const updateColumnY = (columnState: ColumnState, newY: number) => {
    if (columnState.currentColumn === 'left') {
      columnState.leftY = newY;
    } else {
      columnState.rightY = newY;
    }
  };

  // Get current column position
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
    // First, collect all headings from content to build TOC
    const sections = parseMarkdownToSections(content);
    const tocEntries: { title: string; level: number; sectionNum: string }[] = [];
    let tempSectionNum = 0;
    let tempSubsectionNum = 0;

    sections.forEach((section) => {
      if (section.type === 'heading') {
        const cleanTitle = stripExistingNumbering(section.content);
        if (section.level === 1) {
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

    // Render actual TOC entries
    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');

    const tocStartPage = currentPage + 1; // Content starts after TOC
    let estimatedPage = tocStartPage;
    const charsPerPage = 2500;
    let charCount = 0;

    tocEntries.forEach((entry, index) => {
      checkPageBreak(8);

      // Estimate page number based on content position
      const sectionIndex = sections.findIndex(s =>
        s.type === 'heading' &&
        stripExistingNumbering(s.content).toUpperCase() === entry.title ||
        stripExistingNumbering(s.content) === entry.title
      );

      // Calculate char count up to this section
      let sectionCharCount = 0;
      for (let i = 0; i < sectionIndex; i++) {
        sectionCharCount += sections[i].content?.length || 0;
      }
      estimatedPage = tocStartPage + Math.floor(sectionCharCount / charsPerPage);

      const indent = entry.level === 1 ? 0 : 10;
      const tocText = `${entry.sectionNum} ${entry.title}`;
      const pageNumText = `${estimatedPage}`;

      // Draw entry text
      pdf.setFont('times', entry.level === 1 ? 'bold' : 'normal');
      pdf.text(tocText, margin + indent, yPosition);

      // Draw page number right-aligned
      pdf.setFont('times', 'normal');
      pdf.text(pageNumText, pageWidth - margin, yPosition, { align: 'right' });

      // Draw dotted line between title and page number
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


    // Render content in two columns
    sections.forEach((section) => {
      switch (section.type) {
        case 'heading':
          if (section.level === 1) {
            sectionNumber++;
            subsectionNumber = 0;

            // Check page break FIRST, then get fresh positions
            checkTwoColumnPageBreak(columnState, 15, columnCfg.columnWidth, columnCfg.leftColumnX, columnCfg.rightColumnX);

            // Get fresh positions AFTER potential column switch
            const h1Y = getCurrentColumnY(columnState);
            const h1X = getCurrentColumnX(columnState, columnCfg.leftColumnX, columnCfg.rightColumnX);

            const cleanH1 = stripExistingNumbering(section.content);
            const headingText = `${sectionNumber}. ${cleanH1.toUpperCase()}`;

            // Add spacing before heading
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

            // Add spacing before heading
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

            const cleanText = processTextStyle(section.content);
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

          const cleanList = processTextStyle(section.content);
          const newY = renderTextInColumn(cleanList, listX + 5, listY, columnCfg.columnWidth - 5, 10);
          updateColumnY(columnState, newY + 2);
          break;

        case 'space':
          updateColumnY(columnState, getCurrentColumnY(columnState) + 4);
          break;
      }
    });

  } else {
    // ============ SINGLE-COLUMN LAYOUT (Original) ============
    sections.forEach((section) => {
      checkPageBreak(20);

      switch (section.type) {
        case 'heading':
          if (section.level === 1) {
            sectionNumber++;
            subsectionNumber = 0;

            checkPageBreak(25);
            yPosition += 10;
            pdf.setFontSize(14);
            pdf.setFont('times', 'bold');
            const cleanH1 = stripExistingNumbering(section.content);
            const headingText = `${sectionNumber}. ${cleanH1.toUpperCase()}`;
            const h1Lines = pdf.splitTextToSize(headingText, contentWidth);
            pdf.text(h1Lines, margin, yPosition);
            yPosition += h1Lines.length * 7 + 8;
          } else if (section.level === 2) {
            subsectionNumber++;

            checkPageBreak(20);
            yPosition += 6;
            pdf.setFontSize(12);
            pdf.setFont('times', 'bold');
            const cleanH2 = stripExistingNumbering(section.content);
            const h2Text = `${sectionNumber}.${subsectionNumber} ${cleanH2}`;
            const h2Lines = pdf.splitTextToSize(h2Text, contentWidth);
            pdf.text(h2Lines, margin, yPosition);
            yPosition += h2Lines.length * 6 + 6;
          } else {
            checkPageBreak(15);
            yPosition += 4;
            pdf.setFontSize(11);
            pdf.setFont('times', 'bold');
            const cleanH3 = stripExistingNumbering(section.content);
            const cleanHeading = processTextStyle(cleanH3);
            const h3Lines = pdf.splitTextToSize(cleanHeading, contentWidth);
            pdf.text(h3Lines, margin, yPosition);
            yPosition += h3Lines.length * 5 + 5;
          }
          break;

        case 'paragraph':
          pdf.setFontSize(11);
          if (section.content.trim()) {
            // Check if content has bold/italic markers
            if (section.content.includes('**') || section.content.includes('*')) {
              yPosition = renderFormattedText(section.content, margin + 10, yPosition, contentWidth - 10);
            } else {
              pdf.setFont('times', 'normal');
              const paraLines = pdf.splitTextToSize(section.content, contentWidth - 10);
              if (paraLines.length > 0) {
                // First line with indent
                pdf.text(paraLines[0], margin + 10, yPosition);
                yPosition += 6;
                // Rest of lines
                for (let i = 1; i < paraLines.length; i++) {
                  checkPageBreak(6);
                  pdf.text(paraLines[i], margin, yPosition);
                  yPosition += 6;
                }
              }
            }
            yPosition += 3;
          }
          break;

        case 'list-item':
        case 'ordered-list-item':
          pdf.setFontSize(11);
          pdf.setFont('times', 'normal');
          const bullet = section.type === 'ordered-list-item' ? '•' : '•';
          pdf.text(bullet, margin + 5, yPosition);
          const cleanList = processTextStyle(section.content);
          const listLines = pdf.splitTextToSize(cleanList, contentWidth - 15);
          pdf.text(listLines, margin + 12, yPosition);
          yPosition += listLines.length * 6 + 2;
          break;

        case 'table':
          if (section.rows && section.rows.length > 0) {
            checkPageBreak(25 + section.rows.length * 8);

            const colCount = section.rows[0].length;
            const colWidth = contentWidth / colCount;
            const rowHeight = 8;

            section.rows.forEach((row, rowIndex) => {
              row.forEach((cell, colIndex) => {
                const x = margin + colIndex * colWidth;
                const y = yPosition + rowIndex * rowHeight;

                // Draw cell border
                pdf.setDrawColor(150, 150, 150);
                pdf.setLineWidth(0.3);
                pdf.rect(x, y, colWidth, rowHeight);

                // Header row background
                if (rowIndex === 0) {
                  pdf.setFillColor(230, 230, 230);
                  pdf.rect(x, y, colWidth, rowHeight, 'F');
                  pdf.setFont('times', 'bold');
                } else {
                  pdf.setFont('times', 'normal');
                }

                pdf.setFontSize(9);
                const cellText = pdf.splitTextToSize(cell, colWidth - 4);
                pdf.text(cellText[0] || '', x + 2, y + 5);
              });
            });

            yPosition += section.rows.length * rowHeight + 10;
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
          yPosition += codeHeight + 5;
          break;

        case 'space':
          yPosition += 4;
          break;
      }
    });
  }

  // === REFERENCES SECTION ===
  if (structure.includeReferences && structure.citationStyle !== 'none') {
    pdf.addPage();
    currentPage++;
    yPosition = margin;

    sectionNumber++;
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text(`${sectionNumber}. REFERENCES`, margin, yPosition);
    yPosition += 15;

    // Extract citation numbers and generate mock citations
    const citationNumbers = extractCitationNumbers(content);
    let referencesText = '';

    if (citationNumbers.length > 0) {
      const mockCitations = generateMockCitations(citationNumbers);
      pdf.setFontSize(11);
      pdf.setFont('times', 'normal');

      mockCitations.forEach((citation, index) => {
        checkPageBreak(10);
        const formattedRef = `[${index + 1}] ${formatCitation(citation, structure.citationStyle)}`;
        const refLines = pdf.splitTextToSize(formattedRef, contentWidth - 15);

        // Number label
        pdf.text(`[${index + 1}]`, margin, yPosition);

        // Reference text (indented)
        refLines.forEach((line, lineIdx) => {
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
