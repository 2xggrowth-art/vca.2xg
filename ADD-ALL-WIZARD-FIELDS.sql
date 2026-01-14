-- =============================================
-- COMPLETE WIZARD FIELDS MIGRATION
-- Adds all 40+ fields from the 3-level wizard to viral_analyses table
-- Run this in Supabase SQL Editor
-- =============================================

SELECT '=== ADDING ALL WIZARD FIELDS TO viral_analyses ===' as status;

-- =============================================
-- LEVEL 1: BASIC INFO FIELDS (9 new fields)
-- =============================================
DO $$
BEGIN
  -- Platform dropdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'platform') THEN
    ALTER TABLE viral_analyses ADD COLUMN platform TEXT;
    RAISE NOTICE 'Added platform column';
  END IF;

  -- Content Type dropdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'content_type') THEN
    ALTER TABLE viral_analyses ADD COLUMN content_type TEXT;
    RAISE NOTICE 'Added content_type column';
  END IF;

  -- Shoot Type dropdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'shoot_type') THEN
    ALTER TABLE viral_analyses ADD COLUMN shoot_type TEXT;
    RAISE NOTICE 'Added shoot_type column';
  END IF;

  -- Characters Involved text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'characters_involved') THEN
    ALTER TABLE viral_analyses ADD COLUMN characters_involved TEXT;
    RAISE NOTICE 'Added characters_involved column';
  END IF;

  -- Creator Name text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'creator_name') THEN
    ALTER TABLE viral_analyses ADD COLUMN creator_name TEXT;
    RAISE NOTICE 'Added creator_name column';
  END IF;

  -- Unusual Element dropdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'unusual_element') THEN
    ALTER TABLE viral_analyses ADD COLUMN unusual_element TEXT;
    RAISE NOTICE 'Added unusual_element column';
  END IF;

  -- Works Without Audio dropdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'works_without_audio') THEN
    ALTER TABLE viral_analyses ADD COLUMN works_without_audio TEXT;
    RAISE NOTICE 'Added works_without_audio column';
  END IF;

  -- Content Rating (1-10)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'content_rating') THEN
    ALTER TABLE viral_analyses ADD COLUMN content_rating INTEGER CHECK (content_rating >= 1 AND content_rating <= 10);
    RAISE NOTICE 'Added content_rating column';
  END IF;

  -- Replication Strength (1-10)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'replication_strength') THEN
    ALTER TABLE viral_analyses ADD COLUMN replication_strength INTEGER CHECK (replication_strength >= 1 AND replication_strength <= 10);
    RAISE NOTICE 'Added replication_strength column';
  END IF;
END $$;

SELECT '✅ Level 1 fields added' as status;

-- =============================================
-- LEVEL 2: EMOTIONAL & PHYSICAL REACTIONS (9 fields)
-- =============================================
DO $$
BEGIN
  -- Body Reactions (multi-select stored as array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'body_reactions') THEN
    ALTER TABLE viral_analyses ADD COLUMN body_reactions TEXT[];
    RAISE NOTICE 'Added body_reactions column';
  END IF;

  -- Emotion in First 6 Seconds
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'emotion_first_6_sec') THEN
    ALTER TABLE viral_analyses ADD COLUMN emotion_first_6_sec TEXT;
    RAISE NOTICE 'Added emotion_first_6_sec column';
  END IF;

  -- Challenged Belief
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'challenged_belief') THEN
    ALTER TABLE viral_analyses ADD COLUMN challenged_belief TEXT;
    RAISE NOTICE 'Added challenged_belief column';
  END IF;

  -- Emotional Identity Impact (multi-select stored as array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'emotional_identity_impact') THEN
    ALTER TABLE viral_analyses ADD COLUMN emotional_identity_impact TEXT[];
    RAISE NOTICE 'Added emotional_identity_impact column';
  END IF;

  -- If He Can Why Can't You
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'if_he_can_why_cant_you') THEN
    ALTER TABLE viral_analyses ADD COLUMN if_he_can_why_cant_you TEXT;
    RAISE NOTICE 'Added if_he_can_why_cant_you column';
  END IF;

  -- Feel Like Commenting
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'feel_like_commenting') THEN
    ALTER TABLE viral_analyses ADD COLUMN feel_like_commenting TEXT;
    RAISE NOTICE 'Added feel_like_commenting column';
  END IF;

  -- Read Comments
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'read_comments') THEN
    ALTER TABLE viral_analyses ADD COLUMN read_comments TEXT;
    RAISE NOTICE 'Added read_comments column';
  END IF;

  -- Sharing Number
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'sharing_number') THEN
    ALTER TABLE viral_analyses ADD COLUMN sharing_number INTEGER;
    RAISE NOTICE 'Added sharing_number column';
  END IF;

  -- Video Action
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'video_action') THEN
    ALTER TABLE viral_analyses ADD COLUMN video_action TEXT;
    RAISE NOTICE 'Added video_action column';
  END IF;
END $$;

SELECT '✅ Level 2 emotional fields added' as status;

-- =============================================
-- LEVEL 3: HOOK STUDY & ANALYSIS (21 fields - 7 questions with text + audio each)
-- =============================================
DO $$
BEGIN
  -- 1. Stop Feel
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'stop_feel') THEN
    ALTER TABLE viral_analyses ADD COLUMN stop_feel TEXT;
    RAISE NOTICE 'Added stop_feel column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'stop_feel_explanation') THEN
    ALTER TABLE viral_analyses ADD COLUMN stop_feel_explanation TEXT;
    RAISE NOTICE 'Added stop_feel_explanation column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'stop_feel_audio_url') THEN
    ALTER TABLE viral_analyses ADD COLUMN stop_feel_audio_url TEXT;
    RAISE NOTICE 'Added stop_feel_audio_url column';
  END IF;

  -- 2. Immediate Understanding
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'immediate_understanding') THEN
    ALTER TABLE viral_analyses ADD COLUMN immediate_understanding TEXT;
    RAISE NOTICE 'Added immediate_understanding column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'immediate_understanding_audio_url') THEN
    ALTER TABLE viral_analyses ADD COLUMN immediate_understanding_audio_url TEXT;
    RAISE NOTICE 'Added immediate_understanding_audio_url column';
  END IF;

  -- 3. Hook Carrier
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'hook_carrier') THEN
    ALTER TABLE viral_analyses ADD COLUMN hook_carrier TEXT;
    RAISE NOTICE 'Added hook_carrier column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'hook_carrier_audio_url') THEN
    ALTER TABLE viral_analyses ADD COLUMN hook_carrier_audio_url TEXT;
    RAISE NOTICE 'Added hook_carrier_audio_url column';
  END IF;

  -- 4. Hook Without Audio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'hook_without_audio') THEN
    ALTER TABLE viral_analyses ADD COLUMN hook_without_audio TEXT;
    RAISE NOTICE 'Added hook_without_audio column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'hook_without_audio_recording_url') THEN
    ALTER TABLE viral_analyses ADD COLUMN hook_without_audio_recording_url TEXT;
    RAISE NOTICE 'Added hook_without_audio_recording_url column';
  END IF;

  -- 5. Audio Alone Stops Scroll
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'audio_alone_stops_scroll') THEN
    ALTER TABLE viral_analyses ADD COLUMN audio_alone_stops_scroll TEXT;
    RAISE NOTICE 'Added audio_alone_stops_scroll column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'audio_alone_stops_scroll_recording_url') THEN
    ALTER TABLE viral_analyses ADD COLUMN audio_alone_stops_scroll_recording_url TEXT;
    RAISE NOTICE 'Added audio_alone_stops_scroll_recording_url column';
  END IF;

  -- 6. Dominant Emotion First 6
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'dominant_emotion_first_6') THEN
    ALTER TABLE viral_analyses ADD COLUMN dominant_emotion_first_6 TEXT;
    RAISE NOTICE 'Added dominant_emotion_first_6 column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'dominant_emotion_first_6_audio_url') THEN
    ALTER TABLE viral_analyses ADD COLUMN dominant_emotion_first_6_audio_url TEXT;
    RAISE NOTICE 'Added dominant_emotion_first_6_audio_url column';
  END IF;

  -- 7. Understanding By Second 6
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'understanding_by_second_6') THEN
    ALTER TABLE viral_analyses ADD COLUMN understanding_by_second_6 TEXT;
    RAISE NOTICE 'Added understanding_by_second_6 column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'understanding_by_second_6_audio_url') THEN
    ALTER TABLE viral_analyses ADD COLUMN understanding_by_second_6_audio_url TEXT;
    RAISE NOTICE 'Added understanding_by_second_6_audio_url column';
  END IF;

  -- Content Rating Level 3 (1-10)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'content_rating_level_3') THEN
    ALTER TABLE viral_analyses ADD COLUMN content_rating_level_3 INTEGER CHECK (content_rating_level_3 >= 1 AND content_rating_level_3 <= 10);
    RAISE NOTICE 'Added content_rating_level_3 column';
  END IF;
END $$;

SELECT '✅ Level 3 hook study fields added' as status;

-- =============================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_viral_analyses_platform ON viral_analyses(platform);
CREATE INDEX IF NOT EXISTS idx_viral_analyses_content_type ON viral_analyses(content_type);
CREATE INDEX IF NOT EXISTS idx_viral_analyses_content_rating ON viral_analyses(content_rating);
CREATE INDEX IF NOT EXISTS idx_viral_analyses_replication_strength ON viral_analyses(replication_strength);

SELECT '✅ Indexes created' as status;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT '';
SELECT '=== VERIFICATION: Checking all new columns ===' as status;

SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_name IN (
  -- Level 1
  'platform', 'content_type', 'shoot_type', 'characters_involved', 'creator_name',
  'unusual_element', 'works_without_audio', 'content_rating', 'replication_strength',
  -- Level 2
  'body_reactions', 'emotion_first_6_sec', 'challenged_belief', 'emotional_identity_impact',
  'if_he_can_why_cant_you', 'feel_like_commenting', 'read_comments', 'sharing_number', 'video_action',
  -- Level 3
  'stop_feel', 'stop_feel_explanation', 'stop_feel_audio_url',
  'immediate_understanding', 'immediate_understanding_audio_url',
  'hook_carrier', 'hook_carrier_audio_url',
  'hook_without_audio', 'hook_without_audio_recording_url',
  'audio_alone_stops_scroll', 'audio_alone_stops_scroll_recording_url',
  'dominant_emotion_first_6', 'dominant_emotion_first_6_audio_url',
  'understanding_by_second_6', 'understanding_by_second_6_audio_url',
  'content_rating_level_3'
)
ORDER BY column_name;

SELECT '';
SELECT '✅✅✅ ALL WIZARD FIELDS MIGRATION COMPLETE! ✅✅✅' as status;
SELECT 'Total new columns: 38 (9 from Level 1, 9 from Level 2, 20 from Level 3)' as summary;
SELECT 'Next steps: Update analysesService.ts and adminService.ts' as next_steps;
