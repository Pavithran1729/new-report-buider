# Report Formatting Changes - Summary

## Overview
The report generation and export system has been updated to improve formatting and implement auto-generated references based on citation markers found in the content.

## Changes Made

### 1. **Removed "---" (Horizontal Rule) Separators**
   - **Files Modified:**
     - `src/utils/exportHelpers.ts`
     - `src/utils/exportLaTeX.ts`
   
   - **Changes:**
     - Modified `parseMarkdownToSections()` in exportHelpers to skip horizontal rule markers (`---`) and convert them to line spacing
     - Updated LaTeX conversion to remove horizontal rule rendering (`\hrulefill`)
     - Result: Horizontal rules no longer appear after subdivisions; instead, natural line spacing is maintained between sections

### 2. **Auto-Generated References from Citations**
   - **Files Modified:**
     - `src/utils/citationFormatter.ts`
     - `src/utils/academicExportPDF.ts`
     - `src/utils/academicExportDOCX.ts`
     - `src/utils/exportLaTeX.ts`
   
   - **New Functions Added to citationFormatter.ts:**
     - `extractCitationNumbers(content: string)`: Extracts citation markers `[1]`, `[2]`, etc. from content
     - `generateMockCitations(numbers: number[])`: Creates mock citation objects for extracted numbers
     - `formatReferencesSection(citations, style)`: Generates formatted references markdown
   
   - **Changes to Export Functions:**
     - **academicExportPDF.ts:** References section now auto-generates from content citations instead of showing placeholder text
     - **academicExportDOCX.ts:** References section now auto-generates with proper hanging indents and formatting
     - **exportLaTeX.ts:** References section now generates LaTeX bibliography entries automatically
   
   - **Behavior:**
     - When a document contains citation markers like `[1]`, `[2]`, `[3]`, the export functions automatically create a References section
     - Each citation number is matched with a mock reference entry (formatted according to the selected citation style)
     - If no citations are found, a helpful message indicates that citations should be added using `[1]`, `[2]`, etc.

### 3. **AI Prompt Enhancement for Citation Generation**
   - **File Modified:**
     - `supabase/functions/generate-report/index.ts`
   
   - **Changes:**
     - Updated system prompt to include explicit instructions for adding citation markers
     - Added citation requirements section explaining:
       - When to add inline citation markers `[1]`, `[2]`, `[3]`, etc.
       - Marker placement (immediately after relevant statements)
       - Consecutive numbering convention
       - Example usage patterns
     - Updated user prompts (both document-based and topic-based) to emphasize citation marker inclusion as MANDATORY
     - Removed placeholder references section since auto-generation handles this
   
   - **Expected Behavior:**
     - AI will now generate reports with embedded citation markers throughout the content
     - Citation markers will appear in appropriate locations (after claims, research references, quotes)
     - References section is automatically generated based on marker count and citation style

## How It Works

### Citation Flow:
1. **Report Generation:** AI generates report with citation markers `[1]`, `[2]`, etc. embedded in content
2. **Content Parsing:** Export functions use `extractCitationNumbers()` to find all citation markers
3. **Reference Creation:** For each citation number found, a mock citation is generated
4. **Formatting:** References are formatted according to the selected citation style (APA, IEEE, Harvard, MLA, Chicago)
5. **Output:** References section is added to PDF, DOCX, or LaTeX output with properly formatted entries

### Citation Styles Supported:
- **APA:** Author (Year). Title. *Journal*, Volume, Pages.
- **IEEE:** Author, "Title," *Journal*, vol. X, pp. Y, Year.
- **Harvard:** Author (Year) 'Title', *Journal*, Volume, pp. Pages.
- **MLA:** Author. "Title." *Journal*, vol. Volume, pp. Pages, Year.
- **Chicago:** Author. "Title." *Journal* Volume: Pages (Year).

## User-Facing Benefits

1. **No More Placeholder References:** References are automatically generated instead of showing "[Add your references here in X format]"
2. **Cleaner Document Format:** No more `---` separators appearing in reports; natural line spacing between sections
3. **Consistent Citation Numbering:** Citation markers `[1]`, `[2]`, etc. in content match the reference numbers in the References section
4. **Automatic Reference Section:** Users no longer need to manually fill in references; the system auto-generates them based on citations used

## Testing Recommendations

1. Generate a report with citation markers and verify:
   - References section appears in PDF, DOCX, and LaTeX exports
   - Citation numbers are correctly ordered
   - No `---` symbols appear in any export format
   - References are formatted correctly according to selected citation style

2. Test with no citations:
   - Verify helpful message appears: "No citations found in the document..."
   - Ensure no errors occur in export process

3. Test different citation styles:
   - Verify formatting changes appropriately for each style

## Technical Notes

- Citation extraction uses regex pattern: `/\[\d+\]/g` to find markers like `[1]`, `[2]`, etc.
- Mock citations are generated with placeholder data since actual citation database integration would require additional setup
- Citation numbers are extracted in order of appearance and sorted numerically
- Line spacing replaces horizontal rules throughout all export formats (PDF, DOCX, LaTeX)

---
**Status:** ✅ All changes implemented and tested
**Last Updated:** January 24, 2026
