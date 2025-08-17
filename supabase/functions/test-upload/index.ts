import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== TEST UPLOAD FUNCTION ===')
    console.log('Method:', req.method)
    console.log('Content-Type:', req.headers.get('content-type'))
    
    // Test environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_PROJECT_URL') ?? 'https://merjfjpiqppjhdasvyvk.supabase.co'
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    
    console.log('Supabase URL:', supabaseUrl)
    console.log('Service key available:', serviceKey ? 'YES' : 'NO')
    console.log('Service key length:', serviceKey.length)
    console.log('Service key starts with:', serviceKey.substring(0, 20))
    
    // Test Supabase client creation
    const supabase = createClient(supabaseUrl, serviceKey)
    console.log('Supabase client created')
    
    // Test bucket access
    console.log('Testing bucket access...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return new Response(
        JSON.stringify({ 
          error: 'Cannot access storage',
          details: bucketsError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('Available buckets:', buckets?.map(b => b.name))
    
    // Check if candidate_profiles bucket exists
    const candidateBucket = buckets?.find(b => b.name === 'candidate_profiles')
    if (!candidateBucket) {
      return new Response(
        JSON.stringify({ 
          error: 'Bucket candidate_profiles not found',
          available_buckets: buckets?.map(b => b.name) || []
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('Bucket candidate_profiles found!')
    
    // Test basic file upload (dummy file)
    const testData = new TextEncoder().encode('Test PDF content')
    const testFilename = `test-${Date.now()}.txt`
    
    console.log('Uploading test file:', testFilename)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('candidate_profiles')
      .upload(testFilename, testData, {
        contentType: 'text/plain'
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ 
          error: 'Upload failed',
          details: uploadError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('Test upload successful:', uploadData)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage access working!',
        supabase_url: supabaseUrl,
        service_key_configured: !!serviceKey,
        buckets: buckets?.map(b => b.name),
        test_upload: uploadData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Test function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Test function failed',
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})