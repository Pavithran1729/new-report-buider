export type ReportType =
  | 'research-paper'
  | 'project-report'
  | 'thesis'
  | 'lab-report'
  | 'case-study'
  | 'literature-review';

export type CitationStyle = 'none' | 'apa' | 'ieee' | 'harvard' | 'mla' | 'chicago';

export type LayoutType = 'single-column' | 'two-column';

export interface AcademicDetails {
  authorName: string;
  studentId?: string;
  institution: string;
  department?: string;
  course?: string;
  supervisorName?: string;
  submissionDate: string;
}

export interface ReportStructure {
  includeToc: boolean;
  includeAbstract: boolean;
  includeCoverPage: boolean;
  includeReferences: boolean;
  citationStyle: CitationStyle;
  // Layout options
  layout?: LayoutType;
  // Research paper specific
  includeKeywords?: boolean;
  // Thesis/dissertation specific
  includeDeclaration?: boolean;
  includeAcknowledgments?: boolean;
  includeListOfFigures?: boolean;
  includeListOfTables?: boolean;
  // Case study specific
  includeExecutiveSummary?: boolean;
}

export interface AcademicReportConfig {
  reportType: ReportType;
  academicDetails: AcademicDetails;
  structure: ReportStructure;
}

export const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'research-paper', label: 'Research Paper', description: 'Academic research with methodology and findings' },
  { value: 'project-report', label: 'Project Report', description: 'Documentation of project work and outcomes' },
  { value: 'thesis', label: 'Thesis/Dissertation', description: 'Extended academic research document' },
  { value: 'lab-report', label: 'Lab Report', description: 'Scientific experiment documentation' },
  { value: 'case-study', label: 'Case Study', description: 'In-depth analysis of specific subject' },
  { value: 'literature-review', label: 'Literature Review', description: 'Survey of existing research' },
];

export const CITATION_STYLES: { value: CitationStyle; label: string }[] = [
  { value: 'none', label: 'None (No Citations)' },
  { value: 'apa', label: 'APA (7th Edition)' },
  { value: 'ieee', label: 'IEEE' },
  { value: 'harvard', label: 'Harvard' },
  { value: 'mla', label: 'MLA' },
  { value: 'chicago', label: 'Chicago' },
];

export const DEFAULT_ACADEMIC_CONFIG: AcademicReportConfig = {
  reportType: 'project-report',
  academicDetails: {
    authorName: '',
    studentId: '',
    institution: '',
    department: '',
    course: '',
    supervisorName: '',
    submissionDate: new Date().toISOString().split('T')[0],
  },
  structure: {
    includeToc: true,
    includeAbstract: true,
    includeCoverPage: true,
    includeReferences: true,
    citationStyle: 'ieee',
  },
};

// Default structure settings per report type
export const REPORT_TYPE_DEFAULTS: Record<ReportType, Partial<ReportStructure>> = {
  'research-paper': {
    layout: 'two-column',
    includeKeywords: true,
    includeAbstract: true,
    includeToc: false, // Research papers typically don't have TOC
    citationStyle: 'ieee',
  },
  'thesis': {
    layout: 'single-column',
    includeDeclaration: true,
    includeAcknowledgments: true,
    includeListOfFigures: true,
    includeListOfTables: true,
    includeToc: true,
    includeAbstract: true,
    citationStyle: 'apa',
  },
  'lab-report': {
    layout: 'single-column',
    includeAbstract: true,
    includeToc: false,
    citationStyle: 'ieee',
  },
  'case-study': {
    layout: 'single-column',
    includeExecutiveSummary: true,
    includeAbstract: false,
    includeToc: true,
    citationStyle: 'harvard',
  },
  'literature-review': {
    layout: 'single-column',
    includeAbstract: true,
    includeToc: true,
    citationStyle: 'apa',
  },
  'project-report': {
    layout: 'single-column',
    includeAbstract: true,
    includeToc: true,
    citationStyle: 'ieee',
  },
};
