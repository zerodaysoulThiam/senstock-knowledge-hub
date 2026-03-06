import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  // Split by paragraphs first for better semantic boundaries
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 1 > chunkSize && currentChunk.length > 50) {
      chunks.push(currentChunk.trim());
      // Keep overlap from the end of previous chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + " " + trimmed;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }
  }

  if (currentChunk.trim().length > 20) {
    chunks.push(currentChunk.trim());
  }

  // If no paragraph-based chunks were created, fall back to character-based
  if (chunks.length === 0 && text.length > 50) {
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end).trim();
      if (chunk.length > 20) chunks.push(chunk);
      start += chunkSize - overlap;
    }
  }

  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_url, title, file_type, file_size } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the file
    const fileResponse = await fetch(file_url);
    const fileBuffer = await fileResponse.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);

    let extractedText = "";
    const isTxt = file_type === "text/plain" || file_type === "txt" || title.endsWith(".txt");

    if (isTxt) {
      // TXT: direct read
      extractedText = new TextDecoder("utf-8").decode(uint8Array);
    } else if (LOVABLE_API_KEY) {
      // PDF and DOCX: Use Gemini multimodal to extract ALL text content
      // This handles scanned PDFs, complex layouts, embedded fonts, etc.
      const base64Content = btoa(String.fromCharCode(...uint8Array));

      const isPdf = file_type === "application/pdf" || file_type === "pdf" || title.endsWith(".pdf");
      const mimeType = isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      console.log(`Extracting text from ${title} (${mimeType}) using Gemini multimodal...`);

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Tu es un extracteur de texte professionnel. Tu reçois un document (PDF ou DOCX). 
              
INSTRUCTIONS CRITIQUES :
- Extrais TOUT le texte du document, page par page, sans rien omettre.
- Conserve la structure : titres, sous-titres, paragraphes, listes, tableaux.
- Pour les tableaux, utilise un format lisible (lignes séparées par |).
- Indique les numéros de page avec le marqueur [Page X] au début de chaque page.
- Si le document contient des images avec du texte (scannés), effectue l'OCR et extrais le texte.
- Ne résume JAMAIS. Extrais le texte INTÉGRAL et COMPLET.
- Ne commente pas, ne rajoute rien. Retourne UNIQUEMENT le texte extrait du document.
- Si une page est vide ou illisible, indique [Page X - contenu illisible ou vide].`
            },
            {
              role: "user",
              content: [
                {
                  type: "file",
                  file: {
                    filename: title,
                    file_data: `data:${mimeType};base64,${base64Content}`,
                  },
                },
                {
                  type: "text",
                  text: `Extrais TOUT le texte de ce document "${title}" page par page. Texte intégral, complet, sans résumé.`,
                },
              ],
            },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content && content.length > 50) {
          extractedText = content;
          console.log(`Successfully extracted ${extractedText.length} characters from ${title}`);
        } else {
          console.error("AI extraction returned insufficient content");
        }
      } else {
        const errText = await aiResponse.text();
        console.error("AI extraction failed:", aiResponse.status, errText);
      }
    }

    // Fallback: basic text extraction if AI failed
    if (extractedText.length < 50) {
      const rawText = new TextDecoder("utf-8").decode(uint8Array);
      extractedText = rawText
        .replace(/[^\x20-\x7E\xC0-\xFF\n\r\t àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, " ")
        .replace(/\s{3,}/g, "\n")
        .trim();

      if (extractedText.length < 50) {
        extractedText = `[Document ${title} - Le contenu n'a pas pu être extrait. Type: ${file_type}. Veuillez vérifier le format du fichier.]`;
      }
    }

    const fullContent = extractedText.substring(0, 100000); // Allow up to 100k chars

    // Save to documents table
    const { data, error } = await supabase
      .from("documents")
      .insert({
        title,
        content: fullContent,
        file_url,
        file_type,
        file_size,
        status: "indexé",
        category: "general",
      })
      .select()
      .single();

    if (error) throw error;

    // Create chunks for RAG search
    const chunks = chunkText(fullContent);
    if (chunks.length > 0) {
      const chunkRows = chunks.map((content, i) => ({
        document_id: data.id,
        content,
        chunk_index: i,
      }));
      
      // Insert in batches of 50 to avoid payload limits
      for (let i = 0; i < chunkRows.length; i += 50) {
        const batch = chunkRows.slice(i, i + 50);
        const { error: chunkError } = await supabase.from("document_chunks").insert(batch);
        if (chunkError) console.error("Chunk insert error:", chunkError);
      }
    }

    console.log(`Document "${title}" indexed: ${fullContent.length} chars, ${chunks.length} chunks created`);

    return new Response(
      JSON.stringify({
        success: true,
        document: data,
        chunks_created: chunks.length,
        text_length: fullContent.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("extract-text error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur d'extraction" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
