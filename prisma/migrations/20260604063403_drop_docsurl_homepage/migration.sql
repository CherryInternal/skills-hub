/*
  Warnings:

  - You are about to drop the column `docsUrl` on the `Skill` table. All the data in the column will be lost.
  - You are about to drop the column `homepage` on the `Skill` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Skill" DROP COLUMN "docsUrl",
DROP COLUMN "homepage";
