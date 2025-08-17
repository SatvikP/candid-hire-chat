import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { analyzeProfiles } from './profileAnalyzer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration multer pour upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profilesDir = path.join(__dirname, '..', 'profiles');
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}.pdf`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Upload de profils PDF
app.post('/api/upload-profiles', upload.array('profiles', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size
    }));

    res.json({
      message: `${uploadedFiles.length} profile(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error uploading files' });
  }
});

// Analyse des profils
app.post('/api/analyze-profiles', async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    console.log('Starting profile analysis...');
    const results = await analyzeProfiles(jobDescription);

    res.json({
      message: 'Analysis completed',
      jobDescription,
      candidates: results,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Error analyzing profiles',
      details: error.message 
    });
  }
});

// Liste des profils disponibles
app.get('/api/profiles', (req, res) => {
  try {
    const profilesDir = path.join(__dirname, '..', 'profiles');
    
    if (!fs.existsSync(profilesDir)) {
      return res.json({ profiles: [] });
    }

    const files = fs.readdirSync(profilesDir)
      .filter(file => file.endsWith('.pdf'))
      .map(filename => {
        const filePath = path.join(profilesDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          uploadedAt: stats.birthtime
        };
      });

    res.json({ profiles: files });
  } catch (error) {
    console.error('Error listing profiles:', error);
    res.status(500).json({ error: 'Error listing profiles' });
  }
});

// Suppression d'un profil
app.delete('/api/profiles/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '..', 'profiles', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Error deleting profile' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📁 Profiles directory: ${path.join(__dirname, '..', 'profiles')}`);
});