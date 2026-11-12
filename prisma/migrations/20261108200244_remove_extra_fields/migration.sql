/*
  Warnings:

  - You are about to drop the column `accessToken` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `accessTokenExpiresAt` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `idToken` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `refreshTokenExpiresAt` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `verifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "accessToken",
DROP COLUMN "accessTokenExpiresAt",
DROP COLUMN "idToken",
DROP COLUMN "refreshToken",
DROP COLUMN "refreshTokenExpiresAt",
DROP COLUMN "scope";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "emailVerified",
DROP COLUMN "image";

-- DropTable
DROP TABLE "verifications";
