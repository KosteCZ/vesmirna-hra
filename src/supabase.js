// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lyrbkplbjlnoqmkjsafs.supabase.co'
//const supabaseKey = 'sb_publishable_CzI6hOLkD5ByZ1L70D0N6w_WicW9RUI'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cmJrcGxiamxub3Fta2pzYWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTc3MzksImV4cCI6MjA4OTA5MzczOX0.J8CTMEig6-lreBthHvk2YdC7NhHE7t2D5jN-IVlVnis'

export const supabase = createClient(supabaseUrl, supabaseKey)