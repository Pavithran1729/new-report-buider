# Codebase Analysis: Section Content Appending & Modification

## Summary
Found **6 critical locations** where code appends, adds, or modifies section content. The system primarily focuses on **removing** unwanted metadata (word counts) that might be added by the AI, but there are also functions that **generate and append new sections** (references).

---

## 1. POST-PROCESSING: Word Count Removal

### File: [supabase/functions/generate-report/index.ts](supabase/functions/generate-report/index.ts#L236-L260)

**Lines: 236-260** - Post-processing function that removes word count metadata appended by AI

**Code:**
```typescript
// Post-processing: Remove any word count lines that might have been added by the AI
// This is a safeguard to ensure only report content is returned
content = content
  // Remove lines like "*word*: 123" or "(word count: 123)" at the end of sections
  .replace(/\n?\*\*?word\*?\*?:?\s*\d+\s*(?:words?)?\n?/gi, '\n')
  // Remove lines like "(word count: 123)" or "*word count*: 123"
  .replace(/\n?\(?word count:?\s*\d+\)?\n?/gi, '\n')
  // Remove "Word count:" or "Words:" followed by numbers
  .replace(/\n?(?:Word\s+)?[Cc]ount:?\s*\d+\s*(?:words?)?\n?/g, '\n')
  // Remove markdown word count markers at end of paragraphs
  .replace(/\s+\*\d+\s+(?:words?|wc)\*\s*$/gm, '')
  // Remove any standalone parenthetical word counts like "(1250 words)"
  .replace(/\s*\(\d+\s+words?\)\s*$/gm, '')
  // Clean up multiple consecutive newlines created by above removals
  .replace(/\n{3,}/g, '\n\n')
  .trim();
```

**What it does:**
- Strips multiple regex patterns that might indicate word counts
- Removes metadata in formats: `*word*: 123`, `(word count: 123)`, `Word Count:`, etc.
- Cleans up extra newlines created by removals

---

## 2. PARSING: Word Count Line Skipping

### File: [src/utils/exportHelpers.ts](src/utils/exportHelpers.ts#L24-L32)

**Lines: 24-32** - `parseMarkdownToSections()` function that skips word count lines during parsing

**Code:**
```typescript
// Skip word count lines (any line that is just word count metadata)
if (line.match(/^\*?\*?word\*?\*?:?\s*\d+\s*(?:words?)?\s*$/i) ||
    line.match(/^\(?word\s+count:?\s*\d+\)?\s*$/i) ||
    line.match(/^\(?(\d+)\s+words?\)?$/i) ||
    line.match(/^words?:\s*\d+\s*$/i)) {
  return; // Skip this line entirely
}
```

**What it does:**
- Detects lines that contain only word count metadata
- Completely skips these lines during section parsing (doesn't add them to sections array)
- Recognizes multiple word count patterns

---

## 3. CONTENT GENERATION: AI Prompt Restrictions

### File: [supabase/functions/generate-report/index.ts](supabase/functions/generate-report/index.ts#L100-L105)

**Lines: 100-105** - System prompt explicitly forbids AI from adding word counts

**Code:**
```
- Word counts at the end of sections
- Word count statistics or summaries
- Any metadata about section length or word counts
- No "*word*" or "(word count)" or similar markers anywhere
```

**Lines: 145 & 197** - User prompt reinforces restriction:
```
DO NOT INCLUDE: word counts, word count statistics, "*word*" markers, "(word count)" or any metadata about section length. Generate ONLY the report content.
```

**What it does:**
- Instructs the AI model NOT to append word counts or metadata to sections
- Used in both academic and document-based report generation

---

## 4. REFERENCES SECTION GENERATION & APPENDING

### File: [src/utils/citationFormatter.ts](src/utils/citationFormatter.ts#L232-L248)

**Lines: 232-248** - `formatReferencesSection()` function that generates and returns a complete references section

**Code:**
```typescript
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
```

**What it does:**
- **Generates a new section** with heading `# REFERENCES`
- Maps each citation to formatted output with index numbers
- Returns the complete section as a string (meant to be appended to content)

**Note:** This function generates the references section but does NOT automatically append it - callers must handle appending.

---

## 5. EXPORT FUNCTIONS: Adding Metadata After Content

### File: [src/utils/exportHelpers.ts](src/utils/exportHelpers.ts#L126-L132)

**Lines: 126-132** - `calculateReadingTime()` function

**Code:**
```typescript
export const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(wordCount / wordsPerMinute);
};
```

**What it does:**
- Calculates reading time from content word count
- Used for UI display statistics (NOT appended to content itself)
- Located in analytics calculations

---

## 6. ANALYTICS: Word Count Calculation

### File: [src/utils/analytics.ts](src/utils/analytics.ts#L28-L32)

**Lines: 28-32** - `calculateContentStats()` function

**Code:**
```typescript
// Word count
const words = trimmedContent.split(/\s+/).filter(word => word.length > 0);
const wordCount = words.length;

// Character count
const characterCount = trimmedContent.length;
```

**What it does:**
- Extracts statistics from content for UI display
- NOT appended to content
- Used in StatisticsPanel component for metadata display

---

## Key Findings Summary

### ✅ What DOESN'T Append Content:
- Word count calculations (used only for UI display)
- Reading time calculations
- Analytics and statistics

### ⚠️ What DOES Append/Generate Content:
1. **`formatReferencesSection()`** - Generates new section but doesn't auto-append
2. **AI Generation** - Might append word counts (guarded against by AI prompt + post-processing)

### 🛡️ Protection Mechanisms:
1. **AI Prompt Guard** - Explicitly forbids AI from adding word counts
2. **Post-Processing Regex** - 6 different regex patterns remove word count metadata
3. **Parsing Guard** - `parseMarkdownToSections()` skips word count lines entirely
4. **Export Helpers** - Skip word count lines during parsing

---

## Section Appending Patterns Found

### Where Content IS Modified:
1. **During Generation** (supabase/functions/generate-report/index.ts:242)
   - Removes unwanted word count text added by AI

2. **During Parsing** (src/utils/exportHelpers.ts:24-32)
   - Skips word count lines entirely during section parsing

3. **Reference Generation** (src/utils/citationFormatter.ts:232)
   - Generates references section (caller responsible for appending)

### Where Content is NOT Modified:
- Export functions (PDF/DOCX/LaTeX) - only read sections, don't modify
- Components - only display content, don't modify
- Page view calculations - only estimate pages, don't modify

---

## Impact Assessment

**Most Likely Issue:** If word counts ARE appearing in exported documents, they're being added:
1. During AI generation despite the prompt guard
2. By external markdown parsing that wasn't caught by the safeguards

**Recommendation:** Check if:
- The AI model is ignoring the system prompt (possible with some models)
- Sections are being processed by export functions that have different parsing logic
- References section is being appended with extra metadata
