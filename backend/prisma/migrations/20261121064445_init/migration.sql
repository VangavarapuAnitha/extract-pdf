-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "reportId" TEXT,
    "originalFilename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportParameter" (
    "id" SERIAL NOT NULL,
    "reportDbId" INTEGER NOT NULL,
    "parameterName" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "pageNumber" INTEGER,

    CONSTRAINT "ReportParameter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_fileHash_key" ON "Report"("fileHash");

-- AddForeignKey
ALTER TABLE "ReportParameter" ADD CONSTRAINT "ReportParameter_reportDbId_fkey" FOREIGN KEY ("reportDbId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
