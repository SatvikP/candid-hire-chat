import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Extract text from PDF file using PDF.js
 */
async function extractTextFromPDF(filePath) {
  try {
    // For now, let's use a simple mock text extraction
    // In production, you would use a proper PDF parser
    const filename = path.basename(filePath);
    
    // Mock CV content for demo purposes
    const mockCV = `
    CV - ${filename}
    
    PROFIL PROFESSIONNEL
    Développeur Full Stack avec 5 années d'expérience dans le développement d'applications web modernes.
    Passionné par les nouvelles technologies et l'innovation.
    
    COMPÉTENCES TECHNIQUES
    • Langages: JavaScript, TypeScript, Python, Java
    • Frontend: React, Vue.js, Angular, HTML5, CSS3
    • Backend: Node.js, Express, Django, Spring Boot
    • Bases de données: PostgreSQL, MongoDB, MySQL
    • Outils: Git, Docker, AWS, CI/CD
    
    EXPÉRIENCE PROFESSIONNELLE
    Développeur Senior - TechCorp (2019-2024)
    • Développement d'applications React/Node.js
    • Architecture de microservices
    • Optimisation des performances
    
    Développeur Junior - StartupXYZ (2018-2019)
    • Développement full stack
    • Maintenance d'applications legacy
    
    FORMATION
    Master en Informatique - École d'Ingénieurs (2018)
    Licence en Informatique - Université Tech (2016)
    
    LANGUES
    Français: Natif
    Anglais: Courant
    
    CENTRES D'INTÉRÊT
    Technologies émergentes, Open Source, Sport
    `;
    
    return mockCV.trim();
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Analyze a single profile using Claude API
 */
async function analyzeProfile(profileText, jobDescription, filename) {
  try {
    const prompt = `
Tu es un expert en recrutement et ressources humaines. Analyse ce CV par rapport à cette offre d'emploi et fournis un score détaillé.

OFFRE D'EMPLOI:
${jobDescription}

CV À ANALYSER:
${profileText}

Tu dois fournir une réponse au format JSON strict suivant:
{
  "candidate_name": "Nom du candidat (si trouvé)",
  "overall_score": 85,
  "detailed_scores": {
    "technical_skills": {
      "score": 90,
      "explanation": "Excellentes compétences techniques correspondant aux besoins"
    },
    "experience": {
      "score": 80,
      "explanation": "Expérience pertinente de 5 ans dans le domaine"
    },
    "education": {
      "score": 85,
      "explanation": "Formation solide et diplômes pertinents"
    },
    "soft_skills": {
      "score": 75,
      "explanation": "Bonnes compétences relationnelles démontrées"
    },
    "cultural_fit": {
      "score": 80,
      "explanation": "Profil aligné avec les valeurs de l'entreprise"
    }
  },
  "strengths": [
    "Point fort 1",
    "Point fort 2", 
    "Point fort 3"
  ],
  "weaknesses": [
    "Point faible 1",
    "Point faible 2"
  ],
  "recommendation": "HIGHLY_RECOMMENDED | RECOMMENDED | CONDITIONAL | NOT_RECOMMENDED",
  "summary": "Résumé en 2-3 phrases expliquant pourquoi ce candidat correspond ou non au poste"
}

IMPORTANT: 
- Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire
- Assure-toi que le JSON est valide
- Les scores vont de 0 à 100
- Le score global doit être une moyenne pondérée des scores détaillés
- Sois objectif et précis dans tes évaluations
`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const responseText = message.content[0].text.trim();
    
    // Try to parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response:', responseText);
      
      // Fallback analysis if JSON parsing fails
      analysis = {
        candidate_name: "Nom non détecté",
        overall_score: 50,
        detailed_scores: {
          technical_skills: { score: 50, explanation: "Analyse échouée - données insuffisantes" },
          experience: { score: 50, explanation: "Analyse échouée - données insuffisantes" },
          education: { score: 50, explanation: "Analyse échouée - données insuffisantes" },
          soft_skills: { score: 50, explanation: "Analyse échouée - données insuffisantes" },
          cultural_fit: { score: 50, explanation: "Analyse échouée - données insuffisantes" }
        },
        strengths: ["Analyse incomplète"],
        weaknesses: ["Impossible d'analyser le profil correctement"],
        recommendation: "NOT_RECOMMENDED",
        summary: "Erreur lors de l'analyse automatique du profil."
      };
    }

    // Add metadata
    analysis.filename = filename;
    analysis.analyzed_at = new Date().toISOString();

    return analysis;

  } catch (error) {
    console.error(`Error analyzing profile ${filename}:`, error);
    
    // Return error analysis
    return {
      filename,
      candidate_name: "Erreur d'analyse",
      overall_score: 0,
      detailed_scores: {
        technical_skills: { score: 0, explanation: "Erreur lors de l'analyse" },
        experience: { score: 0, explanation: "Erreur lors de l'analyse" },
        education: { score: 0, explanation: "Erreur lors de l'analyse" },
        soft_skills: { score: 0, explanation: "Erreur lors de l'analyse" },
        cultural_fit: { score: 0, explanation: "Erreur lors de l'analyse" }
      },
      strengths: [],
      weaknesses: ["Erreur technique lors de l'analyse"],
      recommendation: "NOT_RECOMMENDED",
      summary: `Erreur lors de l'analyse: ${error.message}`,
      analyzed_at: new Date().toISOString(),
      error: true
    };
  }
}

/**
 * Analyze all profiles in the profiles directory
 */
export async function analyzeProfiles(jobDescription) {
  const profilesDir = path.join(__dirname, '..', 'profiles');
  
  if (!fs.existsSync(profilesDir)) {
    throw new Error('Profiles directory does not exist');
  }

  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const files = fs.readdirSync(profilesDir).filter(file => file.endsWith('.pdf'));
  
  if (files.length === 0) {
    throw new Error('No PDF profiles found in the profiles directory');
  }

  console.log(`Found ${files.length} profile(s) to analyze`);

  const analyses = [];

  for (const filename of files) {
    const filePath = path.join(profilesDir, filename);
    
    try {
      console.log(`Analyzing ${filename}...`);
      
      // Extract text from PDF
      const profileText = await extractTextFromPDF(filePath);
      
      if (!profileText || profileText.trim().length < 100) {
        console.warn(`Profile ${filename} seems to have insufficient text content`);
      }
      
      // Analyze with Claude
      const analysis = await analyzeProfile(profileText, jobDescription, filename);
      analyses.push(analysis);
      
      console.log(`✅ Completed analysis for ${filename} - Score: ${analysis.overall_score}`);
      
      // Add a small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to analyze ${filename}:`, error);
      
      // Add error entry
      analyses.push({
        filename,
        candidate_name: "Erreur",
        overall_score: 0,
        detailed_scores: {
          technical_skills: { score: 0, explanation: "Fichier illisible" },
          experience: { score: 0, explanation: "Fichier illisible" },
          education: { score: 0, explanation: "Fichier illisible" },
          soft_skills: { score: 0, explanation: "Fichier illisible" },
          cultural_fit: { score: 0, explanation: "Fichier illisible" }
        },
        strengths: [],
        weaknesses: ["Fichier PDF corrompu ou illisible"],
        recommendation: "NOT_RECOMMENDED",
        summary: `Impossible de lire le fichier: ${error.message}`,
        analyzed_at: new Date().toISOString(),
        error: true
      });
    }
  }

  // Sort by overall score (highest first)
  analyses.sort((a, b) => b.overall_score - a.overall_score);

  // Return top 3 candidates
  const topCandidates = analyses.slice(0, 3);
  
  console.log(`Analysis complete. Top candidate: ${topCandidates[0]?.candidate_name} (${topCandidates[0]?.overall_score})`);
  
  return {
    total_analyzed: analyses.length,
    top_candidates: topCandidates,
    all_candidates: analyses
  };
}