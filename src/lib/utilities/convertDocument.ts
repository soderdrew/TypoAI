// src/lib/utilities/convertDocument.ts
import showdown from "showdown";
import mammoth from "mammoth";
import Tesseract from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Configure PDF.js worker
const loadPdfWorker = async () => {
    if (typeof window !== 'undefined') {
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
        GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
    }
};

// Initialize PDF.js worker
loadPdfWorker().catch(console.error);

async function extractTextFromPDFWithOCR(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.onload = async () => {
            try {
                const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
                const { data: { text } } = await Tesseract.recognize(
                    typedArray,
                    'eng', // Specify the language
                    { logger: m => console.log(m) } // Optional logger
                );
                resolve(text);
            } catch (error) {
                reject(error);
            }
        };

        fileReader.onerror = (error) => {
            reject(error);
        };

        fileReader.readAsArrayBuffer(file);
    });
}


async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
      const fileReader = new FileReader();

      fileReader.onload = async () => {
          try {
              const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
              const pdf = await getDocument(typedArray).promise;
              let fullText = '';

              for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent();
                  const pageText = textContent.items
                      .map(item => {
                          if ('str' in item) {
                              return item.str;
                          } else {
                              return ''; // Or handle TextMarkedContent differently if needed
                          }
                      })
                      .join(' ');
                  fullText += pageText + '\n';
              }
              resolve(fullText);
          } catch (error) {
              reject(error);
          }
      };

      fileReader.onerror = (error) => {
          reject(error);
      };

      fileReader.readAsArrayBuffer(file);
  });
}

export async function convertDocumentToMarkdown(file: File): Promise<string> {
  try {
    let text: string;

    if (file.type === "application/pdf") {
        try {
            text = await extractTextFromPDF(file);
            // If text is successfully extracted using PDF.js, we don't need OCR
        } catch (pdfJsError) {
            console.warn("PDF.js failed to extract text, attempting OCR...", pdfJsError);
            text = await extractTextFromPDFWithOCR(file);
        }
    }    
    else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // Handle DOCX files using mammoth.js
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      text = result.value;
    } else {
      // Handle other text-based files (TXT, MD, etc.)
      text = await file.text();
    }

    // Initialize Showdown converter
    const converter = new showdown.Converter();
    const markdown = converter.makeMarkdown ? converter.makeMarkdown(text) : text; 

    return markdown;
  } catch (error) {
    console.error("Error converting document to Markdown:", error);
    return `Error converting document: ${error}`;
  }
}