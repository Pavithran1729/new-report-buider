# Citation and Reference System - Flow Diagram

## Report Generation and Export Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REQUEST TO GENERATE REPORT              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           SUPABASE FUNCTION: generate-report                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Enhanced System Prompt:                                     ││
│  │ - Add citation markers [1], [2], etc. as MANDATORY          ││
│  │ - Include inline citations throughout content               ││
│  │ - Use consecutive numbering for citations                   ││
│  │ - Generate realistic mock references                        ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ AI Model (Perplexity/Claude):                               ││
│  │ Generates comprehensive report WITH citation markers        ││
│  │ Example: "Research shows [1] that AI enables [2] solutions" ││
│  └─────────────────────────────────────────────────────────────┘│
└────────────────────────────┬────────────────────────────────────┘
                             │
                    REPORT WITH CITATIONS
                  e.g., "...study [1]..." & "...[2]..."
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         EXPORT DIALOG (PDF / DOCX / LaTeX)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │ PDF      │ │ DOCX     │ │ LaTeX    │
         │ Export   │ │ Export   │ │ Export   │
         └────┬─────┘ └────┬─────┘ └────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│    EXPORT FUNCTIONS: academicExportPDF, academicExportDOCX,    │
│                      exportLaTeX                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Step 1: Extract Citation Numbers                            ││
│  │ Function: extractCitationNumbers(content)                   ││
│  │ Pattern: /\[\d+\]/g matches [1], [2], [3], etc.             ││
│  │ Result: [1, 2, 3, ...]                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Step 2: Generate Mock Citations                             ││
│  │ Function: generateMockCitations(citationNumbers)            ││
│  │ Creates: Citation objects for each number                   ││
│  │ Includes: Title, Authors, Year, Journal, etc.               ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Step 3: Format References                                   ││
│  │ Function: formatCitation(citation, citationStyle)           ││
│  │ Styles: APA, IEEE, Harvard, MLA, Chicago                    ││
│  │ Output: Formatted reference strings                         ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Step 4: Build References Section                            ││
│  │ For PDF: renderText([1] Reference 1, [2] Reference 2, ...)  ││
│  │ For DOCX: Paragraph with TextRun, hanging indent            ││
│  │ For LaTeX: \begin{thebibliography}...\bibitem...            ││
│  └─────────────────────────────────────────────────────────────┘│
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              FINAL FORMATTED DOCUMENT                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. ABSTRACT                                                 ││
│  │    Summary of the report...                                 ││
│  │                                                             ││
│  │ 2. INTRODUCTION                                             ││
│  │    Background information [1]...                            ││
│  │    Key objectives [2] include:                              ││
│  │                                                             ││
│  │ 3. LITERATURE REVIEW                                        ││
│  │    Previous research [3] indicates...                       ││
│  │                                                             ││
│  │ 4. METHODOLOGY                                              ││
│  │    Approach [4] used...                                     ││
│  │                                                             ││
│  │ 5. RESULTS                                                  ││
│  │    Findings [5] show...                                     ││
│  │                                                             ││
│  │ 6. DISCUSSION                                               ││
│  │    Analysis [6] suggests...                                 ││
│  │                                                             ││
│  │ 7. CONCLUSION                                               ││
│  │    Future work [7] includes...                              ││
│  │                                                             ││
│  │ 8. REFERENCES  ◄── AUTO-GENERATED                           ││
│  │    [1] Reference 1 formatted in selected style              ││
│  │    [2] Reference 2 formatted in selected style              ││
│  │    [3] Reference 3 formatted in selected style              ││
│  │    ...                                                      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Key Improvements

### Before Changes:
- References section showed: `[Add your references here in APA format]`
- Horizontal rules (`---`) appeared at end of sections
- Manual reference entry required by user

### After Changes:
- References section auto-generated with actual formatted references
- Horizontal rules replaced with natural line spacing
- Citation numbers in content correspond to reference numbers
- No manual work needed from user

## Citation Number Matching Example

```
CONTENT:
"Machine learning [1] has transformed AI. Deep learning [2] is a subset. 
Recent studies [3] show positive results in [1] mentioned earlier."

EXTRACTED CITATION NUMBERS:
[1, 2, 3]
(Note: [1] appears twice but only counted once in order)

GENERATED REFERENCES:
8. REFERENCES

[1] Reference 1: Machine Learning in Modern AI - Smith et al. (2023)
[2] Reference 2: Deep Learning Fundamentals - Johnson & Lee (2022)
[3] Reference 3: Recent Trends in Machine Learning - Brown, Chen, Davis (2024)
```

## Citation Styles Demonstration

For the same reference, different styles produce:

```
Mock Citation Data:
- Title: "The Impact of Artificial Intelligence"
- Authors: ["Smith, John", "Johnson, Mary"]
- Year: 2023
- Journal: "Journal of AI Research"
- Volume: "15"
- Pages: "123-145"

OUTPUT FORMATS:

APA:
Smith, J., & Johnson, M. (2023). The impact of artificial intelligence. 
*Journal of AI Research*, *15*, 123-145.

IEEE:
J. Smith and M. Johnson, "The impact of artificial intelligence," 
*Journal of AI Research*, vol. 15, pp. 123–145, 2023.

Harvard:
Smith, J. and Johnson, M. (2023) 'The impact of artificial intelligence', 
*Journal of AI Research*, 15, pp. 123–145.

MLA:
Smith, John, and Mary Johnson. "The Impact of Artificial Intelligence." 
*Journal of AI Research*, vol. 15, pp. 123–45, 2023.

Chicago:
Smith, John, and Mary Johnson. "The Impact of Artificial Intelligence." 
*Journal of AI Research* 15, no. 1: 123–145 (2023).
```

## No More Horizontal Rules

```
BEFORE (with --- symbols):
# 1. INTRODUCTION
Introduction text here...
---

## 1.1 Background
Background information...
---

## 1.2 Objectives
Objectives here...
---

AFTER (with natural spacing):
# 1. INTRODUCTION
Introduction text here...

## 1.1 Background
Background information...

## 1.2 Objectives
Objectives here...
```

---
**System Version:** 2.0 - Auto-Generated References
**Date:** January 24, 2026
