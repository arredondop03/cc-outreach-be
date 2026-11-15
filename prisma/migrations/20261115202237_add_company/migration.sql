-- CreateEnum
CREATE TYPE "CompanyHiringRole" AS ENUM ('fe', 'fs');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('new', 'ready_for_sequence', 'active', 'archived');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "summary" TEXT,
    "logo_url" TEXT,
    "job_post_url" TEXT,
    "role" "CompanyHiringRole" NOT NULL,
    "status" "CompanyStatus" NOT NULL,
    "linkedin_url" TEXT NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_domain_key" ON "companies"("domain");
