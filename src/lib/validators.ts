import { z } from "zod";

const emailSchema = z.email().max(255);

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
});

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9-]+$/, "Tags may include letters, numbers, and hyphens.");

const postCoverImageSchema = z
  .url("Cover image URL must be a valid URL.")
  .max(2000)
  .nullable();

export const createPostSchema = z.object({
  title: z.string().trim().min(3).max(180),
  text: z.string().trim().min(10),
  tags: z.array(tagSchema).max(10).default([]),
  coverImageUrl: postCoverImageSchema.optional(),
});

export const updatePostSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    text: z.string().trim().min(10).optional(),
    tags: z.array(tagSchema).max(10).optional(),
    coverImageUrl: postCoverImageSchema.optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.text !== undefined ||
      value.tags !== undefined ||
      value.coverImageUrl !== undefined,
    {
      message: "At least one field must be provided.",
    }
  );
