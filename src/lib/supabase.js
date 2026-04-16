import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://rxykylhicqkxrlweyxhh.supabase.co'
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || 'sb_publishable_782MiOOd_nq_VSdm_dppVQ_0s0KJkkz'

export const supabase = createClient(supabaseUrl, supabaseKey)