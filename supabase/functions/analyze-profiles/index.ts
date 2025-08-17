import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client for storage access
const supabaseUrl = Deno.env.get('SUPABASE_PROJECT_URL') ?? 'https://merjfjpiqppjhdasvyvk.supabase.co'
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Get PDF file data for Claude API (return raw data for direct analysis)
 */
async function getPDFDataForClaude(filename: string): Promise<{data: ArrayBuffer, filename: string} | null> {
  try {
    console.log(`Downloading PDF file for Claude analysis: ${filename}`);
    
    // Download the PDF file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('candidate_profiles')
      .download(filename);

    if (error) {
      console.error(`Error downloading ${filename}:`, error);
      return null;
    }

    if (!data) {
      console.error(`No data received for ${filename}`);
      return null;
    }

    console.log(`Downloaded ${filename}, size: ${data.size} bytes`);

    // Convert Blob to ArrayBuffer for Claude
    const arrayBuffer = await data.arrayBuffer();
    
    return {
      data: arrayBuffer,
      filename: filename
    };
    
  } catch (error) {
    console.error(`Error getting PDF data for ${filename}:`, error);
    return null;
  }
}

/**
 * Extract text using external PDF API
 */
async function extractTextUsingExternalAPI(arrayBuffer: ArrayBuffer, filename: string): Promise<string> {
  try {
    console.log(`Attempting external PDF extraction for ${filename}`);
    
    // Convert ArrayBuffer to base64 for API
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
    const base64Data = btoa(binaryString);
    
    // Try PDF.co API (free tier available)
    const pdfCoResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'demo' // Using demo key for now, you can get a free API key
      },
      body: JSON.stringify({
        url: `data:application/pdf;base64,${base64Data}`,
        inline: true,
        async: false
      })
    });

    if (pdfCoResponse.ok) {
      const result = await pdfCoResponse.json();
      if (result.body && typeof result.body === 'string' && result.body.length > 50) {
        console.log(`PDF.co successfully extracted ${result.body.length} characters`);
        return result.body.trim();
      }
    }

    // Fallback: Try a simple OCR-style approach using a different API
    // This could be replaced with other PDF extraction services
    console.log('PDF.co failed, trying alternative approach...');
    
    // For now, return empty to trigger fallback methods
    return '';
    
  } catch (error) {
    console.error('External API extraction failed:', error);
    return '';
  }
}

/**
 * Extract text from PDF buffer using improved parsing
 */
async function extractTextFromPDFBuffer(buffer: Uint8Array): Promise<string> {
  try {
    // Convert buffer to string for pattern matching
    const pdfString = Array.from(buffer).map(b => String.fromCharCode(b)).join('');
    
    // Look for text objects in PDF structure
    const textMatches = [];
    
    // Pattern 1: Look for text inside parentheses (common in PDFs)
    const parenTextRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = parenTextRegex.exec(pdfString)) !== null) {
      const text = match[1];
      if (text.length > 2 && /[a-zA-Z]/.test(text)) {
        textMatches.push(text);
      }
    }
    
    // Pattern 2: Look for text after 'Tj' operators
    const tjTextRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = tjTextRegex.exec(pdfString)) !== null) {
      const text = match[1].replace(/[()]/g, '');
      if (text.length > 2 && /[a-zA-Z]/.test(text)) {
        textMatches.push(text);
      }
    }
    
    // Pattern 3: Look for text between BT and ET (text objects)
    const btEtRegex = /BT([\s\S]*?)ET/g;
    while ((match = btEtRegex.exec(pdfString)) !== null) {
      const textBlock = match[1];
      const innerTextRegex = /\(([^)]+)\)/g;
      let innerMatch;
      while ((innerMatch = innerTextRegex.exec(textBlock)) !== null) {
        const text = innerMatch[1];
        if (text.length > 2 && /[a-zA-Z]/.test(text)) {
          textMatches.push(text);
        }
      }
    }
    
    // Clean and join extracted text
    const extractedText = textMatches
      .filter(text => text.trim().length > 0)
      .map(text => text.replace(/\\[nr]/g, ' ').trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`Extracted ${extractedText.length} characters using PDF parsing`);
    return extractedText;
    
  } catch (error) {
    console.error('Error in extractTextFromPDFBuffer:', error);
    return '';
  }
}

/**
 * Alternative text extraction method
 */
async function extractTextAlternative(buffer: Uint8Array): Promise<string> {
  try {
    // Simple character extraction for readable ASCII content
    let text = '';
    let consecutiveReadableChars = 0;
    const words = [];
    let currentWord = '';
    
    for (let i = 0; i < buffer.length; i++) {
      const char = String.fromCharCode(buffer[i]);
      
      // Check if character is readable (ASCII letters, numbers, common punctuation)
      if (char.match(/[a-zA-Z0-9àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\s.,;:!?@\-()]/)) {
        consecutiveReadableChars++;
        
        if (char.match(/[a-zA-Z0-9àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\-]/)) {
          currentWord += char;
        } else if (currentWord.length > 1) {
          words.push(currentWord);
          currentWord = '';
        }
        
        text += char;
      } else {
        // If we hit non-readable content, process current word
        if (currentWord.length > 1) {
          words.push(currentWord);
        }
        currentWord = '';
        consecutiveReadableChars = 0;
        
        // Add space for separation
        if (text.length > 0 && !text.endsWith(' ')) {
          text += ' ';
        }
      }
    }
    
    // Add final word
    if (currentWord.length > 1) {
      words.push(currentWord);
    }
    
    // Clean up text
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`Alternative extraction found ${words.length} words, ${cleanedText.length} total characters`);
    
    // Only return if we found substantial content
    if (words.length > 10 && cleanedText.length > 100) {
      return cleanedText;
    }
    
    return '';
    
  } catch (error) {
    console.error('Error in extractTextAlternative:', error);
    return '';
  }
}

function generateRealisticCVFromFilename(filename: string): string {
  // Extract candidate identifier from filename
  const candidateId = filename.replace('.pdf', '').replace(/[^a-zA-Z0-9]/g, '');
  const profileIndex = candidateId.length % 6; // Use filename to select profile type
  
  const profiles = [
    {
      name: "Sarah Chen",
      profile: `CV - Sarah Chen

PROFIL PROFESSIONNEL
Développeuse Full Stack Senior avec 6 années d'expérience spécialisée en React, Node.js et architectures cloud.
Passionnée par l'innovation technologique et le développement d'applications scalables.

COMPÉTENCES TECHNIQUES
• Frontend: React, Next.js, TypeScript, Redux, Tailwind CSS, Vue.js
• Backend: Node.js, Express, NestJS, Python, Django
• Bases de données: PostgreSQL, MongoDB, Redis, ElasticSearch
• Cloud & DevOps: AWS, Docker, Kubernetes, Jenkins, GitLab CI/CD
• Mobile: React Native, Flutter
• Architecture: Microservices, REST APIs, GraphQL

EXPÉRIENCE PROFESSIONNELLE
Lead Developer - TechInnovate (2021-2024)
• Architecture et développement d'une plateforme e-commerce React/Node.js
• Management d'une équipe de 5 développeurs
• Migration vers une architecture microservices (AWS ECS)
• Amélioration des performances de 60% et réduction des coûts de 40%

Développeuse Full Stack Senior - DigitalSolutions (2019-2021)
• Développement d'applications web complexes en React/Express
• Intégration d'APIs tierces et développement d'APIs REST
• Mise en place de tests automatisés et CI/CD
• Formation et mentorat des développeurs junior

Développeuse Full Stack - StartupFlow (2018-2019)
• Développement MVP d'une application fintech en React/Node.js
• Intégration de services de paiement (Stripe, PayPal)
• Développement mobile React Native

FORMATION
Master en Génie Logiciel - EPITECH (2018)
Certifications AWS Solutions Architect Associate (2022)
Certification Google Cloud Professional Developer (2023)

PROJETS PERSONNELS
• Contributrice open source (GitHub: 2000+ stars)
• Blog technique suivi par 5000+ développeurs
• Speaker à 3 conférences tech en 2023

LANGUES
Français: Natif
Anglais: Courant (TOEIC: 950)
Chinois: Intermédiaire

CENTRES D'INTÉRÊT
Intelligence artificielle, blockchain, photographie, escalade`
    },
    {
      name: "Marc Dubois",
      profile: `CV - Marc Dubois

PROFIL PROFESSIONNEL
Développeur Backend spécialisé avec 4 années d'expérience en Java/Spring Boot et Python.
Expert en bases de données et systèmes distribués, avec une forte appétence pour l'optimisation.

COMPÉTENCES TECHNIQUES
• Backend: Java, Spring Boot, Spring Security, Python, Django, FastAPI
• Bases de données: PostgreSQL, MySQL, MongoDB, Redis, Cassandra
• Architecture: Microservices, Domain-Driven Design, Event Sourcing
• Messaging: Apache Kafka, RabbitMQ, Redis Pub/Sub
• Cloud: AWS, GCP, Terraform, Docker, Kubernetes
• Monitoring: Prometheus, Grafana, ELK Stack
• Frontend: Notions de React, HTML/CSS

EXPÉRIENCE PROFESSIONNELLE
Développeur Backend Senior - FinanceSecure (2022-2024)
• Développement d'APIs critiques pour une néobanque (100k+ utilisateurs)
• Architecture de systèmes de paiement haute disponibilité
• Optimisation de requêtes SQL complexes (réduction temps réponse de 80%)
• Mise en place d'une architecture event-driven avec Kafka

Développeur Backend - DataFlow (2020-2022)
• Développement d'APIs REST et GraphQL en Java/Spring Boot
• Migration d'une base de données monolithique vers microservices
• Implémentation de systèmes de cache Redis
• Collaboration avec les équipes frontend et mobile

Développeur Junior - TechConseil (2019-2020)
• Développement de services web Java/Spring
• Maintenance et évolution d'applications legacy
• Tests unitaires et d'intégration avec JUnit

FORMATION
École d'Ingénieurs INSA Lyon - Informatique (2019)
Certification Spring Professional (2021)
Formation Architecture Microservices (2022)

PROJETS TECHNIQUES
• Système de recommandation ML en Python (side project)
• API de géolocalisation open source (500+ stars GitHub)

LANGUES
Français: Natif
Anglais: Bon niveau technique
Allemand: Notions

CENTRES D'INTÉRÊT
Machine Learning, systèmes distribués, trail running, échecs`
    },
    {
      name: "Emma Rodriguez",
      profile: `CV - Emma Rodriguez

PROFIL PROFESSIONNEL
Développeuse Frontend créative avec 5 années d'expérience en React et design systems.
Spécialisée en UX/UI avec une approche centrée utilisateur et une expertise en accessibilité.

COMPÉTENCES TECHNIQUES
• Frontend: React, TypeScript, Next.js, Gatsby, Vue.js
• State Management: Redux, Zustand, Context API, MobX
• Styling: CSS3, Sass, Styled-components, Emotion, Tailwind CSS
• Testing: Jest, React Testing Library, Cypress, Playwright
• Design Systems: Storybook, Figma, Adobe XD, Sketch
• Tools: Webpack, Vite, Parcel, ESLint, Prettier
• Backend: Notions Node.js, Express, REST APIs
• Mobile: React Native (projets personnels)

EXPÉRIENCE PROFESSIONNELLE
Frontend Lead - DesignFirst Agency (2022-2024)
• Création et maintenance de design systems pour 10+ clients B2B
• Développement d'interfaces React complexes avec focus accessibilité
• Audits UX/UI et conformité WCAG 2.1 AA
• Formation équipes dev sur les bonnes pratiques frontend
• Amélioration de la performance web (Core Web Vitals)

Développeuse Frontend Senior - MediaCorp (2020-2022)
• Développement d'applications React pour plateforme média (2M+ utilisateurs)
• Collaboration étroite avec designers et équipe UX
• Optimisation des performances frontend (réduction bundle de 45%)
• Mise en place de tests automatisés et code review

Développeuse Frontend - CreativeStudio (2019-2020)
• Développement de sites web et applications React
• Intégration de maquettes Figma en code pixel-perfect
• Développement responsive et mobile-first

FORMATION
Master Design Interactif - École Supérieure de Design (2019)
Bachelor Informatique - Université Sorbonne (2017)
Certifications Google UX Design (2020)
Formation Accessibilité Web RGAA (2022)

PROJETS & CONTRIBUTIONS
• Mainteneuse d'une librairie React open source (1500+ downloads/semaine)
• Blog technique sur le développement frontend (3000+ abonnés)
• Mentorat de 15+ développeurs junior via ADPList

LANGUES
Français: Natif
Anglais: Courant (vécu 2 ans au Canada)
Espagnol: Natif
Italien: Intermédiaire

CENTRES D'INTÉRÊT
Design thinking, photographie, voyage, cuisine, yoga`
    },
    {
      name: "Alex Johnson",
      profile: `CV - Alex Johnson

PROFIL PROFESSIONNEL
Développeur Full Stack polyvalent avec 3 années d'expérience en startup.
Appétence forte pour l'apprentissage de nouvelles technologies et la résolution de problèmes complexes.

COMPÉTENCES TECHNIQUES
• Frontend: React, JavaScript ES6+, HTML5, CSS3, Bootstrap
• Backend: Node.js, Express, Python, Flask
• Bases de données: MongoDB, PostgreSQL, SQLite
• Cloud: AWS EC2, S3, Heroku, Netlify, Vercel
• Tools: Git, Docker (débutant), Postman, VS Code
• Testing: Jest, Mocha, Chai
• Autres: REST APIs, JSON, npm, yarn

EXPÉRIENCE PROFESSIONNELLE
Développeur Full Stack - GreenTech Startup (2021-2024)
• Développement d'une application web de gestion énergétique
• Stack React/Node.js/MongoDB avec 5000+ utilisateurs actifs
• Intégration d'APIs de capteurs IoT et visualisation de données
• Participation à toutes les phases du cycle de développement
• Collaboration directe avec fondateurs sur roadmap produit

Développeur Web Junior - WebAgency Local (2020-2021)
• Développement de sites vitrine en React et WordPress
• Maintenance et évolution de sites clients existants
• Apprentissage des bonnes pratiques de développement
• Support client et formation utilisateurs

Stage Développeur - TechConsulting (2020)
• Développement d'outils internes en Python/Flask
• Découverte des méthodologies agiles
• Participation aux dailys et retrospectives

FORMATION
Licence Informatique - Université Paris Diderot (2020)
Formation Développeur Web Full Stack - Le Wagon (2019)
Autoformation continue via Udemy, Coursera, YouTube

PROJETS PERSONNELS
• Application mobile React Native de suivi fitness
• Bot Discord en Python pour communauté gaming (500+ utilisateurs)
• Site portfolio personnel avec blog technique

COMPÉTENCES TRANSVERSALES
• Adaptabilité et apprentissage rapide
• Communication et travail en équipe
• Problem-solving et pensée analytique
• Gestion de projets (notions Scrum)

LANGUES
Français: Natif
Anglais: Bon niveau (documentation technique, vidéos)

CENTRES D'INTÉRÊT
Nouvelles technologies, gaming, sport, musique électronique`
    },
    {
      name: "Dr. Sophie Laurent",
      profile: `CV - Dr. Sophie Laurent

PROFIL PROFESSIONNEL
Ingénieure logiciel senior avec 8 années d'expérience et PhD en informatique.
Expertise en architecture logicielle, intelligence artificielle et développement haute performance.

COMPÉTENCES TECHNIQUES
• Langages: Python, Java, C++, JavaScript, TypeScript, Go, Rust
• Frameworks: Django, FastAPI, Spring Boot, React, Angular
• IA/ML: TensorFlow, PyTorch, Scikit-learn, OpenCV, NLP
• Big Data: Apache Spark, Hadoop, Kafka, ElasticSearch
• Bases de données: PostgreSQL, MongoDB, Cassandra, Neo4j
• Cloud: AWS, Google Cloud, Azure, Kubernetes, Docker
• Architecture: Microservices, Event-Driven, CQRS, DDD
• DevOps: Jenkins, GitLab CI, Terraform, Ansible

EXPÉRIENCE PROFESSIONNELLE
Senior Software Architect - AI Research Lab (2020-2024)
• Architecture et développement de systèmes IA pour l'analyse de données médicales
• Leadership technique d'une équipe de 8 ingénieurs
• Développement d'algorithmes ML propriétaires (3 brevets déposés)
• Migration vers architecture cloud-native (AWS/Kubernetes)
• Réduction des coûts d'infrastructure de 50% et amélioration performances de 200%

Lead Developer - HealthTech Corp (2018-2020)
• Développement d'une plateforme de télémédecine (React/Python/PostgreSQL)
• Architecture microservices haute disponibilité (99.9% uptime)
• Gestion d'équipe de 6 développeurs et mise en place de bonnes pratiques
• Conformité RGPD et certifications sécurité médicale

Ingénieure R&D - Tech Research Institute (2016-2018)
• Recherche et développement d'algorithmes de computer vision
• Publications dans 5 conférences internationales
• Développement de prototypes en Python/C++
• Collaboration avec équipes académiques et industrielles

FORMATION & RECHERCHE
PhD en Intelligence Artificielle - École Polytechnique (2016)
Thèse: "Deep Learning pour l'analyse d'images médicales"
Master en Informatique - ENS Cachan (2013)
École Polytechnique - Ingénieure généraliste (2011)

PUBLICATIONS & BREVETS
• 12 publications en conférences internationales (h-index: 15)
• 3 brevets en cours de validation
• Reviewer pour NIPS, ICML, ICCV

COMPÉTENCES MANAGÉRIALES
• Management d'équipes techniques (jusqu'à 10 personnes)
• Gestion de budgets R&D (2M€/an)
• Présentation à des comités de direction
• Formation et mentorat d'ingénieurs

LANGUES
Français: Natif
Anglais: Courant (publications scientifiques)
Allemand: Intermédiaire
Chinois: Notions

CENTRES D'INTÉRÊT
Recherche en IA, piano classique, randonnée, lecture scientifique`
    },
    {
      name: "Thomas Martin",
      profile: `CV - Thomas Martin

PROFIL PROFESSIONNEL
Développeur Backend passionné avec 2 années d'expérience, spécialisé en Node.js.
Récemment diplômé avec une forte motivation pour évoluer vers le développement full stack.

COMPÉTENCES TECHNIQUES
• Backend: Node.js, Express, JavaScript ES6+, TypeScript (apprentissage)
• Bases de données: MongoDB, MySQL, Redis (cache)
• APIs: REST, JWT, OAuth 2.0
• Cloud: AWS EC2, S3, basics Docker
• Testing: Jest, Mocha, Postman
• Tools: Git, GitHub, VS Code, npm
• Frontend: HTML, CSS, notions React (en apprentissage)
• Autres: Socket.io, Nodemailer, Mongoose

EXPÉRIENCE PROFESSIONNELLE
Développeur Backend Junior - StartupLocal (2022-2024)
• Développement d'APIs REST pour application mobile e-commerce
• Gestion d'une base de données MongoDB (10k+ produits)
• Intégration de services de paiement Stripe et PayPal
• Optimisation des requêtes base de données (amélioration 40% perf)
• Participation aux stand-ups et planning poker en méthodologie Scrum
• Collaboration avec développeurs mobile et designer UX

Stage Développeur - WebStudio (2022)
• Développement de sites web avec CMS custom en Node.js
• Création d'APIs pour différents clients
• Apprentissage des bases du développement web
• Formation aux bonnes pratiques Git et code review

FORMATION
Master en Développement Logiciel - SUPINFO (2022)
Licence Informatique - Université Lyon 1 (2020)
Formation en ligne JavaScript/Node.js - freeCodeCamp (2021)
Certification MongoDB Developer Associate (2023)

PROJETS PERSONNELS
• API de gestion de bibliothèque personnelle (Node.js/MongoDB)
• Bot Telegram de notifications météo (500+ utilisateurs)
• Contribution à des projets open source Node.js

SOFT SKILLS
• Curiosité et soif d'apprendre
• Adaptabilité et flexibilité
• Communication claire et concise
• Travail en équipe et entraide
• Attention aux détails et qualité du code

OBJECTIFS PROFESSIONNELS
• Évoluer vers développeur full stack
• Apprendre React/Vue.js pour le frontend
• Développer expertise en architecture logicielle
• Contribuer davantage à l'open source

LANGUES
Français: Natif
Anglais: Intermédiaire (documentation technique)

CENTRES D'INTÉRÊT
Nouvelles technologies, crypto-monnaies, football, jeux vidéo`
    }
  ];

  return profiles[profileIndex].profile;
}

// Keep the old function as backup
function generateMockCVFromFilename(filename: string): string {
  const candidateName = filename
    .replace('.pdf', '')
    .replace(/[-_]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());

  return `CV - ${candidateName}

PROFIL PROFESSIONNEL
Développeur expérimenté avec plusieurs années d'expérience dans le développement d'applications.

COMPÉTENCES TECHNIQUES
• Langages: JavaScript, TypeScript, Python, Java
• Frontend: React, Vue.js, Angular, HTML5, CSS3
• Backend: Node.js, Express, Spring Boot
• Bases de données: PostgreSQL, MongoDB, MySQL
• Outils: Git, Docker, AWS, CI/CD

EXPÉRIENCE PROFESSIONNELLE
Développeur Senior - TechCorp (2020-2024)
• Développement d'applications web modernes
• Architecture et optimisation des performances

Développeur - StartupXYZ (2018-2020)
• Développement full stack
• Maintenance et évolution d'applications

FORMATION
Master en Informatique - École d'Ingénieurs (2018)

LANGUES
Français: Natif, Anglais: Courant`.trim();
}

async function getStoredPDFs(): Promise<{filename: string, data: ArrayBuffer}[]> {
  try {
    console.log('Fetching PDF files from Supabase Storage...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Using service key:', supabaseServiceKey ? 'Yes' : 'No');
    
    const { data: files, error } = await supabase.storage
      .from('candidate_profiles')
      .list('', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing files:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }

    console.log('Files response:', files);

    if (!files || files.length === 0) {
      console.log('No PDF files found in storage');
      return [];
    }

    console.log(`Found ${files.length} files in storage`);

    const pdfs: {filename: string, data: ArrayBuffer}[] = [];
    
    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const pdfData = await getPDFDataForClaude(file.name);
        if (pdfData) {
          pdfs.push({
            filename: pdfData.filename,
            data: pdfData.data
          });
        }
      }
    }

    return pdfs;
  } catch (error) {
    console.error('Error getting stored PDFs:', error);
    return [];
  }
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

async function analyzeProfileWithPDF(pdfData: ArrayBuffer, jobDescription: string, filename: string): Promise<Analysis> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!anthropicApiKey) {
    console.error('ANTHROPIC_API_KEY not configured');
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  console.log(`Starting PDF analysis for ${filename} with API key: ${anthropicApiKey.substring(0, 10)}...`);

  try {
    // Extract text from PDF first
    const uint8Array = new Uint8Array(pdfData);
    
    // Try external API first
    let extractedText = await extractTextUsingExternalAPI(pdfData, filename);
    
    if (!extractedText || extractedText.length < 100) {
      // Fallback to local extraction
      console.log(`External extraction failed for ${filename}, trying local methods...`);
      extractedText = await extractTextFromPDFBuffer(uint8Array);
      
      if (!extractedText || extractedText.length < 50) {
        extractedText = await extractTextAlternative(uint8Array);
      }
    }

    if (!extractedText || extractedText.length < 20) {
      throw new Error(`Could not extract readable text from PDF ${filename}`);
    }

    console.log(`Extracted ${extractedText.length} characters from ${filename}`);

    const prompt = `Tu es un expert en recrutement et ressources humaines. Analyse ce CV par rapport à cette offre d'emploi et fournis un score détaillé.

OFFRE D'EMPLOI:
${jobDescription}

CV À ANALYSER:
${extractedText}

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
- Sois objectif et précis dans tes évaluations`;

    console.log('Making request to Anthropic API...');
    
    const requestBody = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error response:', errorText);
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Anthropic API response received');
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Unexpected response format from Anthropic API:', data);
      throw new Error('Unexpected response format from Anthropic API');
    }
    
    const responseText = data.content[0].text.trim();
    console.log('Raw response text:', responseText);
    
    let analysis;
    try {
      analysis = JSON.parse(responseText);
      console.log('Successfully parsed JSON:', analysis);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response that failed to parse:', responseText);
      
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

    analysis.filename = filename;
    analysis.analyzed_at = new Date().toISOString();

    return analysis;

  } catch (error) {
    console.error(`Error analyzing profile ${filename}:`, error);
    
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

    console.log('Received request with jobDescription:', jobDescription);
    console.log('Received profiles:', profiles ? `${profiles.length} profiles` : 'no profiles provided');

    // Always get PDFs from storage for direct Claude analysis
    console.log('Getting PDFs from Supabase Storage for direct Claude analysis...');
    const storedPDFs = await getStoredPDFs();
    
    if (storedPDFs.length === 0) {
      console.log('No PDF files found in storage.');
      return new Response(
        JSON.stringify({ 
          error: 'No candidate PDF files found. Please upload PDF files to analyze.',
          debug_info: {
            storage_checked: true,
            profiles_in_request: profiles ? profiles.length : 0,
            pdfs_from_storage: 0
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Starting PDF analysis with Claude...');
    const analyses: Analysis[] = [];

    for (const pdf of storedPDFs) {
      console.log(`Analyzing PDF ${pdf.filename} directly with Claude...`);
      
      const analysis = await analyzeProfileWithPDF(pdf.data, jobDescription, pdf.filename);
      analyses.push(analysis);
      
      console.log(`✅ Completed analysis for ${pdf.filename} - Score: ${analysis.overall_score}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    analyses.sort((a, b) => b.overall_score - a.overall_score);
    const topCandidates = analyses.slice(0, 3);
    
    console.log(`Analysis complete. Top candidate: ${topCandidates[0]?.candidate_name} (${topCandidates[0]?.overall_score})`);
    
    const result = {
      total_analyzed: analyses.length,
      top_candidates: topCandidates,
      all_candidates: analyses,
      debug_info: {
        profiles_received: profiles ? profiles.length : 0,
        pdfs_from_storage: storedPDFs.length,
        profiles_used: storedPDFs.length,
        source: 'direct_pdf_claude_analysis',
        analysis_timestamp: new Date().toISOString(),
        used_profiles_list: storedPDFs.map(p => ({ 
          filename: p.filename, 
          size_bytes: p.data.byteLength 
        }))
      }
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