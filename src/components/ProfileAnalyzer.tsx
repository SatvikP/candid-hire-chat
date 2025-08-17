import { useState } from 'react';
import { Upload, Search, Star, TrendingUp, User, BookOpen, Heart, Building } from 'lucide-react';
import { extractTextFromPDF, type ProfileData } from '@/utils/pdfExtractor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface AnalysisResult {
  total_analyzed: number;
  top_candidates: Analysis[];
  all_candidates: Analysis[];
}

const ProfileAnalyzer = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(
      file => file.type === 'application/pdf'
    );
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const uploadProfilesToStorage = async () => {
    if (uploadedFiles.length === 0) return true;

    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('profiles', file);
    });

    try {
      console.log(`Uploading ${uploadedFiles.length} files to Supabase Storage...`);
      
      const response = await fetch('https://merjfjpiqppjhdasvyvk.supabase.co/functions/v1/upload-to-storage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcmpmanBpcXBwamhkYXN2eXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzM2MDAsImV4cCI6MjA3MTAwOTYwMH0.MKSK5ySVqYj8yLSpJM4t-2mpFica8nj-dGdH8PwrqcM`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      console.log(`Successfully uploaded ${result.total_uploaded} files:`, result.files);
      
      setUploadedFiles([]);
      return true;
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Erreur lors de l'upload: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      return false;
    }
  };

  const analyzeProfiles = async () => {
    if (!jobDescription.trim()) {
      setError('Veuillez décrire le poste recherché');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload files to Supabase Storage if any
      if (uploadedFiles.length > 0) {
        console.log(`Uploading ${uploadedFiles.length} files to storage before analysis...`);
        const uploadSuccess = await uploadProfilesToStorage();
        if (!uploadSuccess) {
          setLoading(false);
          return;
        }
      }

      // Start analysis - Edge Function will get profiles from Supabase Storage
      console.log('Starting analysis with profiles from Supabase Storage...');
      
      const response = await fetch('https://merjfjpiqppjhdasvyvk.supabase.co/functions/v1/analyze-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcmpmanBpcXBwamhkYXN2eXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzM2MDAsImV4cCI6MjA3MTAwOTYwMH0.MKSK5ySVqYj8yLSpJM4t-2mpFica8nj-dGdH8PwrqcM`,
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'analyse');
      }

      const result = await response.json();
      console.log('Analysis result:', result);
      
      // Show debug info to user
      if (result.debug_info) {
        console.log('Debug info:', result.debug_info);
        console.log(`Source: ${result.debug_info.source}, Profiles analyzed: ${result.debug_info.profiles_used}`);
      }
      
      setAnalysisResult(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'HIGHLY_RECOMMENDED':
        return 'bg-green-500';
      case 'RECOMMENDED':
        return 'bg-blue-500';
      case 'CONDITIONAL':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case 'HIGHLY_RECOMMENDED':
        return 'Fortement recommandé';
      case 'RECOMMENDED':
        return 'Recommandé';
      case 'CONDITIONAL':
        return 'Recommandé sous conditions';
      default:
        return 'Non recommandé';
    }
  };

  const getScoreIcon = (category: string) => {
    switch (category) {
      case 'technical_skills':
        return <TrendingUp className="h-4 w-4" />;
      case 'experience':
        return <User className="h-4 w-4" />;
      case 'education':
        return <BookOpen className="h-4 w-4" />;
      case 'soft_skills':
        return <Heart className="h-4 w-4" />;
      case 'cultural_fit':
        return <Building className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'technical_skills':
        return 'Compétences techniques';
      case 'experience':
        return 'Expérience';
      case 'education':
        return 'Formation';
      case 'soft_skills':
        return 'Soft skills';
      case 'cultural_fit':
        return 'Adéquation culturelle';
      default:
        return category;
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Analyse de Profils LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Description du poste recherché
            </label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Ex: Nous recherchons un développeur full-stack avec 3+ années d'expérience en React et Node.js..."
              className="min-h-24"
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Upload de nouveaux profils PDF (optionnel)
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Glissez vos fichiers PDF ici ou cliquez pour sélectionner
              </p>
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Sélectionner des fichiers
              </Button>
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Fichiers sélectionnés :</p>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <Badge key={index} variant="secondary">
                    {file.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={analyzeProfiles}
            disabled={loading || !jobDescription.trim()}
            className="w-full"
          >
            {loading ? 'Analyse en cours...' : 'Analyser les profils'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {analysisResult && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Résultats de l'analyse</h2>
            <p className="text-muted-foreground">
              {analysisResult.total_analyzed} profil(s) analysé(s) - Top 3 candidats
            </p>
          </div>

          <div className="grid gap-6">
            {analysisResult.top_candidates.map((candidate, index) => (
              <Card key={candidate.filename} className="relative">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        {candidate.candidate_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {candidate.filename}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {candidate.overall_score}
                      </div>
                      <Badge className={getRecommendationColor(candidate.recommendation)}>
                        {getRecommendationText(candidate.recommendation)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Overall Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Score global</span>
                      <span>{candidate.overall_score}/100</span>
                    </div>
                    <Progress value={candidate.overall_score} className="h-2" />
                  </div>

                  {/* Detailed Scores */}
                  <div>
                    <h4 className="font-semibold mb-3">Scores détaillés</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(candidate.detailed_scores).map(([category, score]) => (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getScoreIcon(category)}
                            <span className="text-sm font-medium">
                              {getCategoryName(category)}
                            </span>
                            <span className="text-sm text-muted-foreground ml-auto">
                              {score.score}/100
                            </span>
                          </div>
                          <Progress value={score.score} className="h-1" />
                          <p className="text-xs text-muted-foreground">
                            {score.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h4 className="font-semibold mb-2">Résumé</h4>
                    <p className="text-sm text-muted-foreground">
                      {candidate.summary}
                    </p>
                  </div>

                  {/* Strengths and Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-green-600">Points forts</h4>
                      <ul className="space-y-1">
                        {candidate.strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2 text-orange-600">Points d'attention</h4>
                      <ul className="space-y-1">
                        {candidate.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-orange-500 mt-1">•</span>
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileAnalyzer;