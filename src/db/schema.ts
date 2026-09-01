import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  leetcodeUsername: text('leetcode_username'),
  leetcodeStats: jsonb('leetcode_stats'),
  githubToken: text('github_token'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id)
    .notNull(),
  slug: text('slug').notNull(),
  title: text('title'),
  code: text('code').notNull(),
  pseudocode: text('pseudocode'),
  lang: text('lang').notNull().default('pseudocode'),
  classification: text('classification').notNull(),
  difficulty: text('difficulty').notNull(),
  timeTakenMs: integer('time_taken_ms'),
  timeComplexity: text('time_complexity'),
  spaceComplexity: text('space_complexity'),
  review: text('review'),
  praise: text('praise'),
  nudge: text('nudge'),
  vizSteps: jsonb('viz_steps'),
  testCase: jsonb('test_case'),
  codeLines: jsonb('code_lines'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  author: one(profiles, {
    fields: [submissions.userId],
    references: [profiles.id],
  }),
}));
