ALTER TABLE "public"."profiles"
ADD COLUMN "leetcode_username" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "leetcode_stats" jsonb;
