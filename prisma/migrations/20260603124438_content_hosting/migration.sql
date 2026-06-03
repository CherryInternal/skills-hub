/*
  Warnings:

  - You are about to drop the column `install` on the `Skill` table. All the data in the column will be lost.
  - You are about to drop the column `installs` on the `Skill` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Skill" DROP COLUMN "install",
DROP COLUMN "installs",
ADD COLUMN     "downloads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "packageKey" TEXT,
ADD COLUMN     "packageName" TEXT,
ADD COLUMN     "packageSize" INTEGER,
ADD COLUMN     "packageUploadedAt" TIMESTAMP(3),
ALTER COLUMN "docsUrl" DROP NOT NULL;
