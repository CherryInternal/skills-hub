-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameZh" TEXT,
    "descriptionEn" TEXT NOT NULL,
    "descriptionZh" TEXT,
    "longDescEn" TEXT NOT NULL,
    "longDescZh" TEXT,
    "domain" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "tags" TEXT[],
    "install" TEXT NOT NULL,
    "docsUrl" TEXT NOT NULL,
    "homepage" TEXT,
    "githubRepoUrl" TEXT,
    "sourceUrl" TEXT,
    "installs" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Skill_published_idx" ON "Skill"("published");

-- CreateIndex
CREATE INDEX "Skill_domain_idx" ON "Skill"("domain");
