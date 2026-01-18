-- Check for duplicate content_ids
SELECT
  content_id,
  COUNT(*) as count,
  array_agg(id::text) as analysis_ids,
  array_agg(created_at::text) as created_dates,
  array_agg(hook) as hooks
FROM viral_analyses
WHERE content_id IS NOT NULL
GROUP BY content_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Also check if the trigger and function exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'generate_content_id';

SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_generate_content_id';
