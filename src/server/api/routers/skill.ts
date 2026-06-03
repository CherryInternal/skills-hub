import { z } from "zod";

import type { Prisma, Skill as SkillRow } from "../../../../generated/prisma";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// DB row → frontend Skill shape (LocalizedString {en, zh?}), so existing
// components keep using pickLocale() unchanged.
function toSkill(row: SkillRow) {
  return {
    id: row.id,
    name: { en: row.nameEn, zh: row.nameZh ?? undefined },
    description: { en: row.descriptionEn, zh: row.descriptionZh ?? undefined },
    longDescription: { en: row.longDescEn, zh: row.longDescZh ?? undefined },
    domain: row.domain,
    author: row.author,
    version: row.version,
    tags: row.tags,
    install: row.install,
    docsUrl: row.docsUrl,
    homepage: row.homepage ?? undefined,
    githubRepoUrl: row.githubRepoUrl ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    installs: row.installs,
    rating: row.rating,
    releaseDate: row.releaseDate.toISOString().slice(0, 10),
    published: row.published,
  };
}

const ORDER: Record<string, Prisma.SkillOrderByWithRelationInput> = {
  popular: { installs: "desc" },
  newest: { releaseDate: "desc" },
  rating: { rating: "desc" },
  name_asc: { nameEn: "asc" },
};

const skillInput = z.object({
  id: z.string().min(1),
  nameEn: z.string().min(1),
  nameZh: z.string().nullish(),
  descriptionEn: z.string(),
  descriptionZh: z.string().nullish(),
  longDescEn: z.string(),
  longDescZh: z.string().nullish(),
  domain: z.string(),
  author: z.string(),
  version: z.string(),
  tags: z.array(z.string()),
  install: z.string(),
  docsUrl: z.string(),
  homepage: z.string().nullish(),
  githubRepoUrl: z.string().nullish(),
  sourceUrl: z.string().nullish(),
  installs: z.number().default(0),
  rating: z.number().default(0),
  releaseDate: z.string(),
  published: z.boolean().default(true),
});

export const skillRouter = createTRPCRouter({
  // ── public ──────────────────────────────────────────────
  list: publicProcedure
    .input(
      z.object({
        domain: z.string().optional(),
        q: z.string().optional(),
        sort: z
          .enum(["popular", "newest", "rating", "name_asc"])
          .default("popular"),
        limit: z.number().min(1).max(200).default(60),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.SkillWhereInput = { published: true };
      if (input.domain) where.domain = input.domain;
      const q = input.q?.trim();
      if (q) {
        where.OR = [
          { nameEn: { contains: q, mode: "insensitive" } },
          { nameZh: { contains: q, mode: "insensitive" } },
          { descriptionEn: { contains: q, mode: "insensitive" } },
          { author: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ];
      }
      const [rows, total] = await Promise.all([
        ctx.db.skill.findMany({
          where,
          orderBy: ORDER[input.sort] ?? ORDER.popular,
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.skill.count({ where }),
      ]);
      return { items: rows.map(toSkill), total };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.skill.findUnique({ where: { id: input.id } });
      return row ? toSkill(row) : null;
    }),

  domainCounts: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.skill.groupBy({
      by: ["domain"],
      where: { published: true },
      _count: { _all: true },
    });
    const out: Record<string, number> = {};
    for (const r of rows) out[r.domain] = r._count._all;
    return out;
  }),

  // ── admin (protected: requires admin session) ──────────
  adminList: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.skill.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map(toSkill);
  }),

  setPublished: protectedProcedure
    .input(z.object({ id: z.string(), published: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.skill.update({
        where: { id: input.id },
        data: { published: input.published },
      });
      return { ok: true };
    }),

  create: protectedProcedure.input(skillInput).mutation(async ({ ctx, input }) => {
    const { releaseDate, ...rest } = input;
    const row = await ctx.db.skill.create({
      data: { ...rest, releaseDate: new Date(releaseDate) },
    });
    return toSkill(row);
  }),

  update: protectedProcedure
    .input(skillInput.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, releaseDate, ...rest } = input;
      const row = await ctx.db.skill.update({
        where: { id },
        data: {
          ...rest,
          ...(releaseDate ? { releaseDate: new Date(releaseDate) } : {}),
        },
      });
      return toSkill(row);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.skill.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
