import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DetailedScore {
  score: number;
  explanation: string;
}

interface Analysis {
  filename: string;
  candidate_name: string;
  overall_score: number;
  detailed_scores: {
    technical_skills: DetailedScore;
    experience: DetailedScore;
    education: DetailedScore;
    soft_skills: DetailedScore;
    cultural_fit: DetailedScore;
  };
  strengths: string[];
  weaknesses: string[];
  recommendation: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'CONDITIONAL' | 'NOT_RECOMMENDED';
  summary: string;
  analyzed_at: string;
  error?: boolean;
}

async function analyzeProfile(profileText: string, jobDescription: string, filename: string): Promise<Analysis> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text.trim();
    
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { jobDescription, profiles } = await req.json()
    
    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: 'Job description is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For demo purposes, we'll analyze mock profiles
    // In production, you'd get these from uploaded files or database
    const mockProfiles = profiles || [
      {
        filename: "candidate1.pdf",
        content: `
        CV - Marie Dupont
        
        PROFIL PROFESSIONNEL
        Développeuse Full Stack avec 7 années d'expérience dans le développement d'applications web et mobile.
        Spécialisée en React, Node.js et architectures cloud.
        
        COMPÉTENCES TECHNIQUES
        • Frontend: React, Vue.js, TypeScript, HTML5, CSS3, Tailwind
        • Backend: Node.js, Express, Python, Django
        • Bases de données: PostgreSQL, MongoDB, Redis
        • Cloud: AWS, Docker, Kubernetes, CI/CD
        • Mobile: React Native
        
        EXPÉRIENCE PROFESSIONNELLE
        Lead Developer - TechStart (2020-2024)
        • Architecture et développement d'applications React/Node.js
        • Management d'une équipe de 4 développeurs
        • Migration vers architecture microservices
        • Amélioration des performances de 40%
        
        Développeuse Senior - WebCorp (2017-2020)
        • Développement full stack d'applications e-commerce
        • Intégration d'APIs tierces
        • Formation des juniors
        
        FORMATION
        Master en Informatique - EPITA (2017)
        Certifications AWS Solutions Architect
        
        LANGUES
        Français: Natif, Anglais: Courant, Espagnol: Intermédiaire
        `
      },
      {
        filename: "candidate2.pdf", 
        content: `
        CV - Jean Martin
        
        PROFIL PROFESSIONNEL
        Développeur Backend avec 3 années d'expérience en Java et Spring Boot.
        Passionné par les architectures distribuées et la performance.
        
        COMPÉTENCES TECHNIQUES
        • Backend: Java, Spring Boot, Spring Security
        • Bases de données: MySQL, PostgreSQL
        • Outils: Maven, Git, Jenkins
        • API: REST, GraphQL
        
        EXPÉRIENCE PROFESSIONNELLE
        Développeur Backend - FinTech Solutions (2021-2024)
        • Développement d'APIs REST pour applications bancaires
        • Optimisation de requêtes SQL
        • Tests unitaires et d'intégration
        
        Développeur Junior - StartupABC (2020-2021)
        • Maintenance d'applications Spring Boot
        • Corrections de bugs
        
        FORMATION
        Licence Informatique - Université Paris Diderot (2020)
        
        LANGUES
        Français: Natif, Anglais: Intermédiaire
        `
      },
      {
        filename: "candidate3.pdf",
        content: `
        CV - Sophie Chen
        
        PROFIL PROFESSIONNEL
        Développeuse Frontend avec 4 années d'expérience en React et design systems.
        Expertise en UX/UI et accessibilité web.
        
        COMPÉTENCES TECHNIQUES
        • Frontend: React, TypeScript, Next.js, Gatsby
        • Styling: CSS3, Sass, Styled-components, Tailwind
        • Outils: Figma, Storybook, Jest, Cypress
        • Design: UX/UI, Design systems, Accessibilité
        
        EXPÉRIENCE PROFESSIONNELLE
        Frontend Lead - Design Agency (2022-2024)
        • Création de design systems pour clients B2B
        • Développement d'interfaces React complexes
        • Audit accessibilité et conformité WCAG
        
        Développeuse Frontend - MediaCorp (2020-2022)
        • Développement d'applications React
        • Collaboration étroite avec designers
        • Optimisation des performances frontend
        
        FORMATION
        Master Design Interactif - École de Design (2020)
        Certifications Google UX Design
        
        LANGUES
        Français: Natif, Anglais: Courant, Chinois: Natif
        `
      }
    ];

    console.log('Starting profile analysis...');
    const analyses: Analysis[] = [];

    for (const profile of mockProfiles) {
      console.log(`Analyzing ${profile.filename}...`);
      
      const analysis = await analyzeProfile(profile.content, jobDescription, profile.filename);
      analyses.push(analysis);
      
      console.log(`✅ Completed analysis for ${profile.filename} - Score: ${analysis.overall_score}`);
      
      // Add a small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Sort by overall score (highest first)
    analyses.sort((a, b) => b.overall_score - a.overall_score);

    // Return top 3 candidates
    const topCandidates = analyses.slice(0, 3);
    
    console.log(`Analysis complete. Top candidate: ${topCandidates[0]?.candidate_name} (${topCandidates[0]?.overall_score})`);
    
    const result = {
      total_analyzed: analyses.length,
      top_candidates: topCandidates,
      all_candidates: analyses
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in analyze-profiles function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error analyzing profiles',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})