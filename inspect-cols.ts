import { supabaseAdmin } from './src/lib/supabaseClient';

async function main() {
  const { data, error } = await supabaseAdmin.rpc('get_columns', { table_name: 'pipeline_reviews' });
  if (error) {
    // If RPC doesn't exist, try querying information_schema
    const { data: cols, error: colsErr } = await supabaseAdmin
      .from('pipeline_reviews')
      .select('*')
      .limit(1);
    console.log('Cols query result:', { cols, colsErr });
  } else {
    console.log('Columns:', data);
  }
}

main();
