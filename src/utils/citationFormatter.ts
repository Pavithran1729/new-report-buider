import type { CitationStyle } from '@/types/academicReport';

export interface Citation {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  journal?: string;
  volume?: string;
  pages?: string;
  doi?: string;
  url?: string;
}

const formatAuthorName = (author: string, style: CitationStyle): string => {
  const parts = author.split(/,\s*/);
  if (parts.length === 2) {
    const [lastName, firstName] = parts;
    switch (style) {
      case 'apa':
        return `${lastName}, ${firstName.charAt(0)}.`;
      case 'ieee':
        return `${firstName.charAt(0)}. ${lastName}`;
      case 'harvard':
        return `${lastName}, ${firstName.charAt(0)}.`;
      case 'mla':
        return `${lastName}, ${firstName}`;
      case 'chicago':
        return `${lastName}, ${firstName}`;
      default:
        return author;
    }
  }
  return author;
};

const formatAuthors = (authors: string[], style: CitationStyle): string => {
  if (authors.length === 0) return '';
  
  const formatted = authors.map(a => formatAuthorName(a, style));
  
  switch (style) {
    case 'apa':
      if (formatted.length === 1) return formatted[0];
      if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
      if (formatted.length <= 20) {
        return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
      }
      return `${formatted.slice(0, 19).join(', ')}, ... ${formatted[formatted.length - 1]}`;
      
    case 'ieee':
      if (formatted.length <= 6) {
        if (formatted.length === 1) return formatted[0];
        return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`;
      }
      return `${formatted[0]} et al.`;
      
    case 'harvard':
      if (formatted.length === 1) return formatted[0];
      if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
      return `${formatted[0]} et al.`;
      
    case 'mla':
      if (formatted.length === 1) return formatted[0];
      if (formatted.length === 2) return `${formatted[0]}, and ${formatted[1]}`;
      return `${formatted[0]}, et al.`;
      
    case 'chicago':
      if (formatted.length === 1) return formatted[0];
      if (formatted.length <= 3) {
        return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`;
      }
      return `${formatted[0]} et al.`;
      
    default:
      return formatted.join(', ');
  }
};

export const formatCitation = (citation: Citation, style: CitationStyle): string => {
  if (style === 'none') return '';
  
  const authors = formatAuthors(citation.authors, style);
  const year = citation.year || 'n.d.';
  const title = citation.title;
  const journal = citation.journal || '';
  const volume = citation.volume || '';
  const pages = citation.pages || '';
  const doi = citation.doi ? `https://doi.org/${citation.doi}` : '';
  const url = citation.url || '';
  
  switch (style) {
    case 'apa':
      let apa = `${authors} (${year}). ${title}.`;
      if (journal) apa += ` *${journal}*`;
      if (volume) apa += `, *${volume}*`;
      if (pages) apa += `, ${pages}`;
      apa += '.';
      if (doi) apa += ` ${doi}`;
      else if (url) apa += ` Retrieved from ${url}`;
      return apa;
      
    case 'ieee':
      let ieee = `${authors}, "${title},"`;
      if (journal) ieee += ` *${journal}*`;
      if (volume) ieee += `, vol. ${volume}`;
      if (pages) ieee += `, pp. ${pages}`;
      ieee += `, ${year}.`;
      if (doi) ieee += ` doi: ${citation.doi}`;
      else if (url) ieee += ` [Online]. Available: ${url}`;
      return ieee;
      
    case 'harvard':
      let harvard = `${authors} (${year}) '${title}'`;
      if (journal) harvard += `, *${journal}*`;
      if (volume) harvard += `, ${volume}`;
      if (pages) harvard += `, pp. ${pages}`;
      harvard += '.';
      if (doi) harvard += ` Available at: ${doi}`;
      else if (url) harvard += ` Available at: ${url}`;
      return harvard;
      
    case 'mla':
      let mla = `${authors}. "${title}."`;
      if (journal) mla += ` *${journal}*`;
      if (volume) mla += `, vol. ${volume}`;
      if (pages) mla += `, pp. ${pages}`;
      mla += `, ${year}.`;
      if (url) mla += ` Web. ${url}`;
      else if (doi) mla += ` Web. https://doi.org/${citation.doi}`;
      return mla;
      
    case 'chicago':
      let chicago = `${authors}. "${title}."`;
      if (journal) chicago += ` *${journal}*`;
      if (volume) chicago += ` ${volume}`;
      if (pages) chicago += `: ${pages}`;
      chicago += ` (${year}).`;
      if (doi) chicago += ` ${doi}.`;
      else if (url) chicago += ` Accessed ${url}.`;
      return chicago;
      
    default:
      return `${authors}. ${title}. ${year}.`;
  }
};

export const formatInTextCitation = (
  authors: string[], 
  year: number | null, 
  style: CitationStyle,
  citationNumber?: number
): string => {
  if (style === 'none') return '';
  
  const firstAuthor = authors[0]?.split(/,\s*/)[0] || 'Unknown';
  const yearStr = year?.toString() || 'n.d.';
  
  switch (style) {
    case 'apa':
      if (authors.length === 1) return `(${firstAuthor}, ${yearStr})`;
      if (authors.length === 2) {
        const secondAuthor = authors[1]?.split(/,\s*/)[0] || '';
        return `(${firstAuthor} & ${secondAuthor}, ${yearStr})`;
      }
      return `(${firstAuthor} et al., ${yearStr})`;
      
    case 'ieee':
      return citationNumber ? `[${citationNumber}]` : '[?]';
      
    case 'harvard':
      if (authors.length === 1) return `(${firstAuthor}, ${yearStr})`;
      if (authors.length === 2) {
        const secondAuthor = authors[1]?.split(/,\s*/)[0] || '';
        return `(${firstAuthor} and ${secondAuthor}, ${yearStr})`;
      }
      return `(${firstAuthor} et al., ${yearStr})`;
      
    case 'mla':
      if (authors.length === 1) return `(${firstAuthor})`;
      return `(${firstAuthor} et al.)`;
      
    case 'chicago':
      if (authors.length === 1) return `(${firstAuthor} ${yearStr})`;
      if (authors.length <= 3) {
        const authorList = authors.map(a => a.split(/,\s*/)[0]).join(', ');
        return `(${authorList} ${yearStr})`;
      }
      return `(${firstAuthor} et al. ${yearStr})`;
      
    default:
      return `(${firstAuthor}, ${yearStr})`;
  }
};

/**
 * Extract citation numbers from content (e.g., [1], [2], [3])
 * Returns an array of unique citation numbers in order of appearance
 */
export const extractCitationNumbers = (content: string): number[] => {
  const matches = content.match(/\[\d+\]/g) || [];
  const numbers = matches.map(m => parseInt(m.slice(1, -1), 10));
  // Return unique numbers in order of first appearance
  return [...new Set(numbers)].sort((a, b) => a - b);
};

/**
 * Generate mock citations for extracted citation numbers
 * This creates placeholder citations that can be used in references
 */
export const generateMockCitations = (citationNumbers: number[]): Citation[] => {
  // Sample DOI and URL patterns for realistic mock data
  const mockDois = ['10.1016/j.example', '10.1109/example', '10.1145/example', '10.1038/example', '10.1126/example'];
  const mockUrls = ['https://example.com/research', 'https://doi.org/10.1016/j.example', 'https://arxiv.org/abs/example', 'https://scholar.google.com/example'];
  
  return citationNumbers.map((num) => ({
    id: `citation-${num}`,
    title: `Reference ${num}: [Citation to be filled by author]`,
    authors: ['Author Name'],
    year: new Date().getFullYear(),
    journal: 'Journal Title',
    volume: 'Volume',
    pages: 'Pages',
    doi: mockDois[num % mockDois.length],
    url: mockUrls[num % mockUrls.length],
  }));
};

/**
 * Format references section as markdown
 */
export const formatReferencesSection = (
  citations: Citation[],
  style: CitationStyle
): string => {
  if (style === 'none' || citations.length === 0) {
    return '';
  }

  const references = citations
    .map((citation, index) => `${index + 1}. ${formatCitation(citation, style)}`)
    .join('\n');

  return `# REFERENCES\n\n${references}`;
};
