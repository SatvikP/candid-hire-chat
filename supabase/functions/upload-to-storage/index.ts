import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_PROJECT_URL') ?? 'https://merjfjpiqppjhdasvyvk.supabase.co'
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Upload request received');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key configured:', supabaseServiceKey ? 'Yes' : 'No');
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers.get('content-type'));
    
    // Get the request body as form data
    const formData = await req.formData()
    const files: File[] = []
    
    // Extract all PDF files from form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && value.type === 'application/pdf') {
        files.push(value)
        console.log(`Found PDF file: ${value.name}, size: ${value.size}`)
      }
    }

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No PDF files found in request' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const uploadedFiles = []

    for (const file of files) {
      try {
        console.log(`Uploading ${file.name} to Supabase Storage...`)
        
        // Generate unique filename to avoid conflicts
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(7)
        const fileExtension = file.name.split('.').pop()
        const uniqueFilename = `${timestamp}-${randomSuffix}.${fileExtension}`
        
        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('candidate_profiles')
          .upload(uniqueFilename, arrayBuffer, {
            contentType: 'application/pdf',
            duplex: 'half'
          })

        if (error) {
          console.error(`Error uploading ${file.name}:`, error)
          throw new Error(`Upload failed: ${error.message}`)
        }

        console.log(`Successfully uploaded ${file.name} as ${uniqueFilename}`)

        uploadedFiles.push({
          originalName: file.name,
          storedName: uniqueFilename,
          size: file.size,
          path: data.path,
          uploadedAt: new Date().toISOString()
        })

      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        // Continue with other files even if one fails
      }
    }

    if (uploadedFiles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'All file uploads failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully uploaded ${uploadedFiles.length} files`)

    return new Response(
      JSON.stringify({
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        files: uploadedFiles,
        total_uploaded: uploadedFiles.length,
        total_attempted: files.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error uploading files',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})