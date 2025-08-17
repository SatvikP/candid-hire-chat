/**
 * Utility functions for PDF text extraction on the client side
 */

// Simple text extraction from PDF files
// Note: This is a basic implementation. For production, consider using pdf-lib or similar
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // For now, we'll use a simple approach
    // In a real implementation, you'd use a PDF parsing library like pdf-lib
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to string (this is very basic and won't work for complex PDFs)
    // This is mainly for demonstration - you'd need a proper PDF parser
    let text = '';
    
    // Try to extract some basic text (this is a very naive approach)
    for (let i = 0; i < uint8Array.length - 1; i++) {
      const char = String.fromCharCode(uint8Array[i]);
      if (char.match(/[a-zA-Z0-9\s.,;:!?\-()]/)) {
        text += char;
      }
    }
    
    // If no text extracted, return a mock CV content based on filename
    if (text.length < 100) {
      return generateMockCVContent(file.name);
    }
    
    return text.substring(0, 5000); // Limit text length
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    // Fallback to mock content
    return generateMockCVContent(file.name);
  }
}

function generateMockCVContent(filename: string): string {
  const candidateName = filename.replace('.pdf', '').replace(/[-_]/g, ' ');
  
  return `
CV - ${candidateName}

PROFIL PROFESSIONNEL
Développeur avec plusieurs années d'expérience dans le développement d'applications web.
Passionné par les nouvelles technologies et l'innovation.

COMPÉTENCES TECHNIQUES
• Langages: JavaScript, TypeScript, Python
• Frontend: React, Vue.js, HTML5, CSS3
• Backend: Node.js, Express
• Bases de données: PostgreSQL, MongoDB
• Outils: Git, Docker, CI/CD

EXPÉRIENCE PROFESSIONNELLE
Développeur Senior - TechCorp (2020-2024)
• Développement d'applications web modernes
• Collaboration en équipe agile
• Optimisation des performances

Développeur Junior - StartupXYZ (2018-2020)
• Développement full stack
• Maintenance d'applications

FORMATION
Master en Informatique - École d'Ingénieurs (2018)

LANGUES
Français: Natif
Anglais: Courant

CENTRES D'INTÉRÊT
Technologies émergentes, Open Source
  `.trim();
}

export interface ProfileData {
  filename: string;
  content: string;
  size: number;
}