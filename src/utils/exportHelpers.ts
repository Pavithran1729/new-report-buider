import type { Template } from "./templates";
import type { ExtractedData } from "./regexProcessor";

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

export const formatDate = (): string => {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Helper function to remove word count metadata from text
export const removeWordCountMetadata = (text: string): string => {
  if (!text) return text;
  
  return text
    // Remove word count at end of line or paragraph
    .replace(/\s*\(\d+\s+words?\)\s*$/gm, '')
    .replace(/\s*\*\d+\s+words?\*\s*$/gm, '')
    .replace(/\s*\*\*\d+\s+words?\*\*\s*$/gm, '')
    // Remove "word count: X" patterns
    .replace(/\s*\*?(?:word\s+)?count\*?:?\s*\d+\s*(?:words?)?\s*$/gim, '')
    // Remove asterisk-wrapped word counts like ***250 words***
    .replace(/\s*\*{1,}\d+\s+(?:words?|wc)\*{1,}\s*$/gim, '')
    .trim();
};

export const parseMarkdownToSections = (content: string) => {
  const lines = content.split('\n');
  const sections: { type: string; content: string; level?: number; isBold?: boolean; isItalic?: boolean; rows?: string[][] }[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let skipUntilNextSection = false;

  lines.forEach((line, index) => {
    // Skip any line that contains word count metadata
    const wordCountPattern = /(?:\*word\*|\*\*word\*\*|word count|words:|word:|\(\d+\s+words?\)|\*\d+\s+words?\*|^[\s]*\d+\s+(?:words?|wc)\s*$)/gi;
    if (wordCountPattern.test(line)) {
      return; // Skip this line entirely
    }
    
    // Skip word count lines (any line that is just word count metadata)
    if (line.match(/^\*?\*?word\*?\*?:?\s*\d+\s*(?:words?)?\s*$/i) ||
        line.match(/^\(?word\s+count:?\s*\d+\)?\s*$/i) ||
        line.match(/^\(?(\d+)\s+words?\)?$/i) ||
        line.match(/^words?:\s*\d+\s*$/i) ||
        line.match(/^\*{1,}\s*\d+\s+(?:words?|wc)\s*\*{1,}\s*$/i)) {
      return; // Skip this line entirely
    }

    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        sections.push({ type: 'code', content: codeContent.join('\n') });
        codeContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    // Handle tables
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // Skip separator rows
      if (!line.match(/^\|[\s\-:]+\|/)) {
        const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      sections.push({ type: 'table', content: '', rows: tableRows });
      tableRows = [];
      inTable = false;
    }

    // Handle headings
    if (line.startsWith('#### ')) {
      skipUntilNextSection = false;
      sections.push({ type: 'heading', content: line.slice(5), level: 4 });
    } else if (line.startsWith('### ')) {
      skipUntilNextSection = false;
      sections.push({ type: 'heading', content: line.slice(4), level: 3 });
    } else if (line.startsWith('## ')) {
      skipUntilNextSection = false;
      sections.push({ type: 'heading', content: line.slice(3), level: 2 });
    } else if (line.startsWith('# ')) {
      const headingText = line.slice(2);
      // Skip REFERENCES section and all content until next main section
      if (headingText.match(/^(REFERENCES|8\.\s+REFERENCES|References)$/i)) {
        skipUntilNextSection = true;
        return;
      }
      skipUntilNextSection = false;
      sections.push({ type: 'heading', content: headingText, level: 1 });
    } else if (skipUntilNextSection) {
      // Skip all content under REFERENCES section
      return;
    } else if (line.trim() === '') {
      sections.push({ type: 'space', content: '' });
    } else if (line.match(/^---+$/)) {
      // Skip horizontal rules - replace with space instead
      sections.push({ type: 'space', content: '' });
    } else if (line.match(/^\d+\.\s/)) {
      const cleanedContent = removeWordCountMetadata(line.replace(/^\d+\.\s/, ''));
      sections.push({ type: 'ordered-list-item', content: cleanedContent });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const cleanedContent = removeWordCountMetadata(line.slice(2));
      sections.push({ type: 'list-item', content: cleanedContent });
    } else {
      const cleanedContent = removeWordCountMetadata(line);
      sections.push({ type: 'paragraph', content: cleanedContent });
    }
  });

  // Close any open table
  if (inTable && tableRows.length > 0) {
    sections.push({ type: 'table', content: '', rows: tableRows });
  }

  return sections;
};

export const createExtractedDataTable = (extractedData: ExtractedData[]) => {
  if (extractedData.length === 0) return null;

  const groupedData: Record<string, string[]> = {};
  
  extractedData.forEach((item) => {
    if (!groupedData[item.type]) {
      groupedData[item.type] = [];
    }
    groupedData[item.type].push(item.value);
  });

  return groupedData;
};

export const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(wordCount / wordsPerMinute);
};
