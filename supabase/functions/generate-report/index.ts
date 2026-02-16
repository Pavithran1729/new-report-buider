import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      title, 
      template = 'professional', 
      documentContent = '', 
      additionalInstructions = '',
      reportType = 'project-report',
      academicDetails = null
    } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    console.log('Generating report for title:', title);
    console.log('Report type:', reportType);
    console.log('Document content length:', documentContent.length);
    console.log('Additional instructions:', additionalInstructions);

    const hasDocument = documentContent && documentContent.trim().length > 0;

    // Build academic context
    let academicContext = '';
    if (academicDetails) {
      academicContext = `
Author: ${academicDetails.authorName || 'Not specified'}
Institution: ${academicDetails.institution || 'Not specified'}
${academicDetails.department ? `Department: ${academicDetails.department}` : ''}
${academicDetails.supervisorName ? `Supervisor: ${academicDetails.supervisorName}` : ''}
`;
    }

    const systemPrompt = `You are an expert academic report writer and document analyst with exceptional attention to detail. You specialize in creating comprehensive, well-structured academic reports following proper academic formatting standards.

CRITICAL FORMATTING REQUIREMENTS:
1. Use proper markdown hierarchy with numbered sections:
   - # 1. SECTION NAME (main sections, all caps)
   - ## 1.1 Subsection Name (numbered subsections)
   - ### 1.1.1 Sub-subsection (if needed)

2. Structure your report with these MANDATORY sections for academic reports:
   - ABSTRACT (brief summary of entire report)
   - INTRODUCTION (background, objectives, scope)
   - LITERATURE REVIEW / BACKGROUND (relevant research)
   - METHODOLOGY (approach, methods used)
   - RESULTS / FINDINGS (main content)
   - DISCUSSION (analysis of findings)
   - CONCLUSION (summary and future work)
   - REFERENCES (placeholder for citations)

3. Citation and Reference Requirements:
   - Add inline citation markers [1], [2], [3], etc. whenever you reference research, studies, or sources
   - Each citation marker should appear immediately after the relevant statement or claim
   - Example: "According to recent studies [1], machine learning has revolutionized artificial intelligence [2]."
   - Use consecutive numbering [1], [2], [3], etc. in order of first appearance
   - Generate realistic mock references for each citation number used
   - The reference section will be auto-generated based on these citations

4. Formatting guidelines:
   - Use **bold** for key terms and important concepts
   - Use *italic* for definitions and emphasis
   - Use proper tables with headers for data presentation
   - Use LaTeX for mathematical formulas: $inline$ or $$block$$
   - Use bullet points and numbered lists appropriately
   - Include figure/table references where appropriate

5. Writing style:
   - Formal academic tone
   - Third person perspective
   - Clear, concise, and precise language
   - Proper paragraph structure with topic sentences
   - Smooth transitions between sections

6. Content depth:
   - Each section should be comprehensive (minimum 200-300 words)
   - Include specific details, examples, and explanations
   - Provide thorough analysis, not just surface-level descriptions
   - Ensure citations are appropriately distributed throughout the document

7. IMPORTANT - DO NOT include:
   - Word counts at the end of sections
   - Word count statistics or summaries
   - Any metadata about section length or word counts
   - No "*word*" or "(word count)" or similar markers anywhere
   - Generate ONLY the report content, nothing else`;

    let userPrompt = '';

    if (hasDocument) {
      userPrompt = `Analyze the following document and generate a comprehensive ${reportType.replace(/-/g, ' ')} based on it.

=== DOCUMENT CONTENT ===
${documentContent}
=== END OF DOCUMENT ===

Report Title: "${title}"
Report Type: ${reportType.replace(/-/g, ' ')}
Template Style: ${template}
${academicContext ? `\nAcademic Context:\n${academicContext}` : ''}

${additionalInstructions ? `
=== USER INSTRUCTIONS ===
${additionalInstructions}
=== END OF INSTRUCTIONS ===

Follow the user's specific instructions above when analyzing the document and creating the report.
` : ''}

IMPORTANT: Generate a COMPLETE and COMPREHENSIVE academic report. Do NOT truncate or cut off the content. 
Each section must be fully developed with detailed content.

CITATION REQUIREMENT: Add citation markers [1], [2], [3], etc. throughout the report whenever you reference sources, research, or claims. This is MANDATORY.

Structure your report with properly numbered sections:
# 1. ABSTRACT
# 2. INTRODUCTION  
# 3. LITERATURE REVIEW
# 4. METHODOLOGY
# 5. RESULTS AND FINDINGS
# 6. DISCUSSION
# 7. CONCLUSION

Generate the complete report with all sections fully populated. Include citations as instructed.

DO NOT INCLUDE: word counts, word count statistics, "*word*" markers, "(word count)" or any metadata about section length. Generate ONLY the report content.`;

    } else {
      userPrompt = `Generate a comprehensive ${reportType.replace(/-/g, ' ')} on the topic: "${title}"

Report Type: ${reportType.replace(/-/g, ' ')}
Template Style: ${template}
${academicContext ? `\nAcademic Context:\n${academicContext}` : ''}

${additionalInstructions ? `Additional Context/Instructions:\n${additionalInstructions}\n` : ''}

IMPORTANT: Generate a COMPLETE and COMPREHENSIVE academic report. Do NOT truncate or cut off the content.
Each section must be fully developed with detailed content (minimum 200-300 words per major section).

CITATION REQUIREMENT: Add citation markers [1], [2], [3], etc. throughout the report whenever you reference sources, research, or claims. This is MANDATORY. Example: "According to recent research [1], the findings show [2]..."

Structure your report with properly numbered sections:
# 1. ABSTRACT
(Brief 150-200 word summary of the entire report)

# 2. INTRODUCTION
## 2.1 Background
## 2.2 Objectives
## 2.3 Scope

# 3. LITERATURE REVIEW
## 3.1 Theoretical Framework
## 3.2 Previous Research
## 3.3 Current Trends

# 4. METHODOLOGY
## 4.1 Research Approach
## 4.2 Data Collection
## 4.3 Analysis Methods

# 5. RESULTS AND FINDINGS
## 5.1 Key Findings
## 5.2 Data Analysis
## 5.3 Observations

# 6. DISCUSSION
## 6.1 Interpretation of Results
## 6.2 Implications
## 6.3 Limitations

# 7. CONCLUSION
## 7.1 Summary
## 7.2 Recommendations
## 7.3 Future Work

Generate the complete report with all sections fully populated. Be thorough, detailed, and include citations as instructed.

DO NOT INCLUDE: word counts, word count statistics, "*word*" markers, "(word count)" or any metadata about section length. Generate ONLY the report content.`;
    }

    console.log('Sending request to Perplexity API...');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 16000, // Increased for longer reports
        return_images: false,
        return_related_questions: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

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
      // Remove entire lines that are just word count info
      .replace(/^.*?(?:\*word\*|\*\*word\*\*|word count|words:|word:)\s*\d+.*$/gim, '')
      // Remove lines with format like "**Word Count:** 250" or "*Word Count*: 250"
      .replace(/^.*?\*{1,2}(?:word\s+)?count\*{1,2}.*$/gim, '')
      // Remove lines containing "words" that look like word count metadata
      .replace(/^[\s]*[\*\-]?\s*\d+\s+(?:words?|wc)\s*[\*\-]?\s*$/gim, '')
      // Remove lines with just asterisks and word count like "***250 words***"
      .replace(/^\s*\*{1,}\s*\d+\s+(?:words?|wc)\s*\*{1,}\s*$/gim, '')
      // Remove section ending markers with word counts
      .replace(/\n\*{3,}.*$/gm, '')
      // Clean up multiple consecutive newlines created by above removals
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log('Report generated successfully, length:', content.length);

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
