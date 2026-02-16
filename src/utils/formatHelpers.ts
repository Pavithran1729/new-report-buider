import type { ReportType, ReportStructure, LayoutType } from '@/types/academicReport';
import { REPORT_TYPE_DEFAULTS } from '@/types/academicReport';

/**
 * Get default structure settings for a specific report type
 */
export const getReportTypeDefaults = (reportType: ReportType): Partial<ReportStructure> => {
    return REPORT_TYPE_DEFAULTS[reportType] || {};
};

/**
 * Merge user-provided structure with report type defaults
 */
export const mergeWithDefaults = (
    reportType: ReportType,
    userStructure: ReportStructure
): ReportStructure => {
    const defaults = getReportTypeDefaults(reportType);
    return {
        ...defaults,
        ...userStructure,
        // Override layout only if explicitly set by user
        layout: userStructure.layout || defaults.layout || 'single-column',
    } as ReportStructure;
};

/**
 * Determine if content should use two-column layout
 */
export const shouldUseTwoColumn = (
    reportType: ReportType,
    layout?: LayoutType
): boolean => {
    if (layout) {
        return layout === 'two-column';
    }
    const defaults = getReportTypeDefaults(reportType);
    return defaults.layout === 'two-column';
};

/**
 * Format section heading according to report type conventions
 */
export const formatHeadingForType = (
    heading: string,
    level: number,
    reportType: ReportType
): { text: string; uppercase: boolean; numbered: boolean } => {
    // Research papers: Level 1 headings in UPPERCASE, numbered
    if (reportType === 'research-paper') {
        return {
            text: heading,
            uppercase: level === 1,
            numbered: true,
        };
    }

    // Thesis: Chapter-style headings (always uppercase for level 1)
    if (reportType === 'thesis') {
        return {
            text: level === 1 ? `CHAPTER ${heading}` : heading,
            uppercase: level === 1,
            numbered: level === 1,
        };
    }

    // Lab reports: Structured sections, uppercase level 1
    if (reportType === 'lab-report') {
        return {
            text: heading,
            uppercase: level === 1,
            numbered: true,
        };
    }

    // Default: Standard academic format
    return {
        text: heading,
        uppercase: level === 1,
        numbered: true,
    };
};

/**
 * Get margin configuration for report type and layout
 */
export const getMargins = (
    reportType: ReportType,
    layout?: LayoutType
): { top: number; right: number; bottom: number; left: number } => {
    const isTwoColumn = shouldUseTwoColumn(reportType, layout);

    if (isTwoColumn) {
        // Narrower margins for two-column layout
        return { top: 15, right: 15, bottom: 20, left: 15 };
    }

    // Thesis gets wider left margin for binding
    if (reportType === 'thesis') {
        return { top: 25, right: 25, bottom: 25, left: 35 };
    }

    // Standard margins
    return { top: 25, right: 25, bottom: 25, left: 25 };
};

/**
 * Calculate column width and gap for two-column layout
 */
export const getColumnConfig = (
    pageWidth: number,
    margins: { left: number; right: number }
): { columnWidth: number; columnGap: number; leftColumnX: number; rightColumnX: number } => {
    const columnGap = 10;
    const availableWidth = pageWidth - margins.left - margins.right;
    const columnWidth = (availableWidth - columnGap) / 2;

    return {
        columnWidth,
        columnGap,
        leftColumnX: margins.left,
        rightColumnX: margins.left + columnWidth + columnGap,
    };
};

/**
 * Get report type display name
 */
export const getReportTypeLabel = (reportType: ReportType): string => {
    const labels: Record<ReportType, string> = {
        'research-paper': 'Research Paper',
        'project-report': 'Project Report',
        'thesis': 'Thesis/Dissertation',
        'lab-report': 'Laboratory Report',
        'case-study': 'Case Study',
        'literature-review': 'Literature Review',
    };
    return labels[reportType] || 'Academic Report';
};

/**
 * Get recommended citation style for report type
 */
export const getDefaultCitationStyle = (reportType: ReportType): string => {
    const defaults = getReportTypeDefaults(reportType);
    return defaults.citationStyle || 'ieee';
};
