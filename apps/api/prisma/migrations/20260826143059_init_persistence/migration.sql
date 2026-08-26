-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "githubId" BIGINT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "repositoryUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisSnapshot" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCommits" INTEGER NOT NULL,
    "activeDays" INTEGER NOT NULL,
    "averageCommitsPerActiveDay" DOUBLE PRECISION NOT NULL,
    "busiestDayDate" TIMESTAMP(3),
    "busiestDayCommits" INTEGER,
    "stars" INTEGER NOT NULL,
    "forks" INTEGER NOT NULL,
    "watchers" INTEGER NOT NULL,
    "openIssues" INTEGER NOT NULL,
    "conventionalPercentage" DOUBLE PRECISION NOT NULL,
    "breakingChanges" INTEGER NOT NULL,
    "totalContributors" INTEGER NOT NULL,
    "concentrationPercentage" DOUBLE PRECISION NOT NULL,
    "concentrationRisk" TEXT NOT NULL,
    "languages" JSONB NOT NULL,
    "categories" JSONB NOT NULL,
    "activity" JSONB NOT NULL,
    "contributors" JSONB NOT NULL,
    "truncated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnalysisSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE INDEX "Repository_owner_idx" ON "Repository"("owner");

-- CreateIndex
CREATE INDEX "AnalysisSnapshot_repositoryId_idx" ON "AnalysisSnapshot"("repositoryId");

-- CreateIndex
CREATE INDEX "AnalysisSnapshot_repositoryId_periodDays_idx" ON "AnalysisSnapshot"("repositoryId", "periodDays");

-- CreateIndex
CREATE INDEX "AnalysisSnapshot_repositoryId_analyzedAt_idx" ON "AnalysisSnapshot"("repositoryId", "analyzedAt");

-- AddForeignKey
ALTER TABLE "AnalysisSnapshot" ADD CONSTRAINT "AnalysisSnapshot_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
