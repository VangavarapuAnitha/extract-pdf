import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadReport(file: Express.Multer.File) {
    // 1. Validate file extension
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Only PDF files are allowed');
    }

    // 2. Validate MIME type
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Invalid file type');
    }

    // 3. Validate actual PDF signature
    const fileSignature = file.buffer.subarray(0, 5).toString();

    if (fileSignature !== '%PDF-') {
      throw new BadRequestException('The uploaded file is not a valid PDF');
    }

    // 4. Generate SHA-256 hash
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');

    // 5. Check whether this PDF already exists
    const existingReport = await this.prisma.report.findUnique({
      where: {
        fileHash,
      },
    });

    if (existingReport) {
      throw new ConflictException('This PDF has already been uploaded');
    }

    // 6. Create uploads directory if it doesn't exist
    const uploadsDirectory = join(process.cwd(), 'uploads');

    await mkdir(uploadsDirectory, { recursive: true });

    // 7. Generate a unique file path
    const filePath = join(uploadsDirectory, `${fileHash}.pdf`);

    // Track the database report ID so we can update its status if processing fails.
    let reportDbId: number | null = null;

    try {
      // 8. Save the PDF
      await writeFile(filePath, file.buffer);

      // 9. Create the initial report record
      const report = await this.prisma.report.create({
        data: {
          reportId: null,
          originalFilename: file.originalname,
          fileHash,
          filePath,
          status: 'PENDING',
        },
      });

      reportDbId = report.id;

      // 10. Extract PDF text using PDF.js first
      let extractedText: string;

      try {
        extractedText = await this.extractPdfText(file.buffer);
      } catch (error) {
        console.error('PDF text extraction failed:', error);

        throw new BadRequestException(
          'The uploaded PDF is corrupted or cannot be read.',
        );
      }

      // 11. Extract report identifiers
      let reportId = this.extractIdentifier(extractedText, 'Report ID');
      let sampleId = this.extractIdentifier(extractedText, 'Sample ID');

      // 12. Extract parameters
      let parameters = this.extractParameters(extractedText);

      // 13. If no parameters are found, try OCR
      if (parameters.length === 0) {
        console.log('No report parameters found using PDF.js. Trying OCR...');

        const ocrText = await this.extractPdfTextUsingOcr(file.buffer);

        const ocrReportId = this.extractIdentifier(ocrText, 'Report ID');
        const ocrSampleId = this.extractIdentifier(ocrText, 'Sample ID');

        const ocrParameters = this.extractOcrParameters(ocrText);

           reportId = reportId ?? ocrReportId;
        sampleId = sampleId ?? ocrSampleId;
        parameters = ocrParameters;

         console.log(`OCR extracted ${parameters.length} parameters.`);
      }

      // 14. Validate extracted parameters
      if (parameters.length === 0) {
        throw new BadRequestException(
          'No report parameters could be extracted. Please upload a supported lab report PDF.',
        );
      }

      // 13. Update report and save all parameters together
      const updatedReport = await this.prisma.report.update({
        where: {
          id: report.id,
        },
        data: {
          reportId,
          sampleId,
          status: 'COMPLETED',
          parameters: {
            create: parameters.map((parameter) => ({
              parameterName: parameter.parameterName,
              value: parameter.value,
              unit: parameter.unit,
              referenceRange: parameter.referenceRange,
              displayOrder: parameter.displayOrder,
              pageNumber: parameter.pageNumber,
            })),
          },
        },
        include: {
          parameters: true,
        },
      });

      return {
        message: 'PDF uploaded and parameters saved successfully.',
        report: updatedReport,
      };
    } catch (error) {
      // 14. If a report record was created, mark it as FAILED.
      if (reportDbId !== null) {
        try {
          await this.prisma.report.update({
            where: {
              id: reportDbId,
            },
            data: {
              status: 'FAILED',
            },
          });
        } catch (statusError) {
          // Do not hide the original processing error.
          console.error('Could not update report status:', statusError);
        }
      }

      // 15. Delete the uploaded PDF to avoid leaving an incomplete file.
      try {
        await unlink(filePath);
      } catch (fileError) {
        // The file might not have been created, or deletion might have failed.
        console.error('Could not delete uploaded PDF:', fileError);
      }

      // Pass the original error to NestJS.
      throw error;
    }
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const pdfData = new Uint8Array(buffer);

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl:
        join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts') +
        '/',
    });

    try {
      const pdf = await loadingTask.promise;

      const extractedPages: string[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();

        type PositionedText = {
          text: string;
          x: number;
          y: number;
        };

        const positionedItems: PositionedText[] = [];

        // Step 1: Collect text and its position
        for (const item of content.items) {
          if ('str' in item && 'transform' in item && item.str.trim()) {
            positionedItems.push({
              text: item.str.trim(),
              x: item.transform[4] ?? 0,
              y: item.transform[5] ?? 0,
            });
          }
        }

        // Step 2: Sort from top to bottom, then left to right
        positionedItems.sort((a, b) => b.y - a.y || a.x - b.x);

        // Step 3: Group text items belonging to the same line
        const lines: {
          y: number;
          items: PositionedText[];
        }[] = [];

        for (const item of positionedItems) {
          const existingLine = lines.find(
            (line) => Math.abs(line.y - item.y) < 3,
          );

          if (existingLine) {
            existingLine.items.push(item);
          } else {
            lines.push({
              y: item.y,
              items: [item],
            });
          }
        }

        // Step 4: Arrange each line from left to right
        const pageText = lines
          .map((line) =>
            line.items
              .sort((a, b) => a.x - b.x)
              .map((item) => item.text)
              .join('\t'),
          )
          .join('\n');

        extractedPages.push(`--- Page ${pageNumber} ---\n${pageText}`);
      }

      return extractedPages.join('\n\n');
    } finally {
      await loadingTask.destroy();
    }
  }

  private async extractPdfTextUsingOcr(buffer: Buffer): Promise<string> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl:
        join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts') +
        '/',
    });

    let ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      const pdf = await loadingTask.promise;

      // Create one OCR worker and reuse it for all pages.
      ocrWorker = await createWorker('eng');

      const extractedPages: string[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);

        // Convert the PDF page into an image.
        const viewport = page.getViewport({ scale: 2 });

        const canvas = createCanvas(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height),
        );

        const context = canvas.getContext('2d');

        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          canvasContext: context as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise;

        // Convert the image into a PNG buffer.
        const imageBuffer = canvas.toBuffer('image/png');

        // Extract text from the image using OCR.
        const result = await ocrWorker.recognize(imageBuffer);

        extractedPages.push(`--- Page ${pageNumber} ---\n${result.data.text}`);

        await page.cleanup();
      }

      return extractedPages.join('\n\n');
    } finally {
      if (ocrWorker) {
        await ocrWorker.terminate();
      }

      await loadingTask.destroy();
    }
  }

  private extractIdentifier(
    text: string,
    identifierType: 'Report ID' | 'Sample ID',
  ): string | null {
    const label =
      identifierType === 'Report ID' ? 'Report\\s*ID' : 'Sample\\s*ID';

    const pattern = new RegExp(`${label}\\s*[:#-]?\\s*([^\\t\\r\\n]+)`, 'i');

    const match = text.match(pattern);

    const value = match?.[1]?.trim();

    if (!value) {
      return null;
    }

    const isMissingValue =
      /^(not\s+provided|not\s+available|n\/a|none|null|missing|-)$/i.test(
        value,
      );

    if (isMissingValue) {
      return null;
    }

    return value;
  }

  private extractParameters(text: string) {
    const parameters: {
      parameterName: string;
      value: string;
      unit: string | null;
      referenceRange: string | null;
      displayOrder: number;
      pageNumber: number;
    }[] = [];

    const pageMatches = [
      ...text.matchAll(/--- Page (\d+) ---([\s\S]*?)(?=--- Page \d+ ---|$)/g),
    ];

    let displayOrder = 1;

    for (const pageMatch of pageMatches) {
      const pageNumber = Number(pageMatch[1]);
      const pageText = pageMatch[2];

      const lines = pageText
        .split('\n')
        .map((line) => line.split('\t').map((cell) => cell.trim()))
        .filter((cells) => cells.some((cell) => cell.length > 0));

      let headerFound = false;

      for (const cells of lines) {
        const normalizedLine = cells.join(' ').toLowerCase();

        if (
          normalizedLine.includes('parameter') &&
          normalizedLine.includes('result')
        ) {
          headerFound = true;
          continue;
        }

        if (!headerFound) {
          continue;
        }

        if (
          normalizedLine.startsWith('note:') ||
          normalizedLine.startsWith('end of')
        ) {
          headerFound = false;
          continue;
        }

        if (cells.length < 2 || !cells[0] || !cells[1]) {
          continue;
        }

        const parameterName = cells[0];
        const value = cells[1];

        let unit: string | null = null;
        let referenceRange: string | null = null;

        const thirdCell = cells[2]?.trim() || '';
        const fourthCell = cells[3]?.trim() || '';

        if (thirdCell && this.isReferenceRange(thirdCell)) {
          // The unit column is missing.
          referenceRange = thirdCell;
        } else {
          unit = this.normalizeOptionalValue(thirdCell);
          referenceRange = this.normalizeOptionalValue(fourthCell);
        }

        parameters.push({
          parameterName,
          value,
          unit,
          referenceRange,
          displayOrder: displayOrder++,
          pageNumber,
        });
      }
    }

    return parameters;
  }

  private extractOcrParameters(text: string) {
    const parameters: {
      parameterName: string;
      value: string;
      unit: string | null;
      referenceRange: string | null;
      displayOrder: number;
      pageNumber: number;
    }[] = [];

    const pageMatches = [
      ...text.matchAll(/--- Page (\d+) ---([\s\S]*?)(?=--- Page \d+ ---|$)/g),
    ];

    let displayOrder = 1;

    for (const pageMatch of pageMatches) {
      const pageNumber = Number(pageMatch[1]);
      const pageText = pageMatch[2];

      const lines = pageText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      let headerFound = false;

      for (const line of lines) {
        const normalizedLine = line.toLowerCase();

        // Find the table header.
        if (
          normalizedLine.includes('parameter') &&
          normalizedLine.includes('result')
        ) {
          headerFound = true;
          continue;
        }

        if (!headerFound) continue;

        // Stop parsing at the report footer.
        if (
          normalizedLine.startsWith('note:') ||
          normalizedLine.startsWith('end of')
        ) {
          headerFound = false;
          continue;
        }

        const cells = line.split(/\s+/);

        if (cells.length < 2) continue;

        // Find the result value.
        // Prioritize values such as <150, Positive and Nil
        // to avoid mistaking numbers in parameter names for results.
        const specialValueIndex = cells.findIndex((cell) =>
          /^(?:[<>]=?\d+(?:\.\d+)?|positive|negative|nil|trace|normal|abnormal|present|absent)$/i.test(
            cell,
          ),
        );

        let valueIndex = specialValueIndex;

        // If no special value is found, look for a numeric result.
        if (valueIndex === -1) {
          valueIndex = cells.findIndex((cell) => /^\d+(?:\.\d+)?$/.test(cell));
        }

        // Cannot identify a result value.
        if (valueIndex <= 0) continue;

        const parameterName = cells.slice(0, valueIndex).join(' ');
        const value = cells[valueIndex];

        if (!parameterName) continue;

        const remainingCells = cells.slice(valueIndex + 1);

        let unit: string | null = null;
        let referenceRange: string | null = null;

        // Check whether the last remaining cell is a reference range.
        if (
          remainingCells.length > 0 &&
          this.isReferenceRange(remainingCells[remainingCells.length - 1])
        ) {
          referenceRange = this.normalizeOptionalValue(
            remainingCells[remainingCells.length - 1],
          );

          unit = this.normalizeOptionalValue(
            remainingCells.slice(0, -1).join(' '),
          );
        } else {
          unit = this.normalizeOptionalValue(remainingCells.join(' '));
        }

        parameters.push({
          parameterName,
          value,
          unit,
          referenceRange,
          displayOrder: displayOrder++,
          pageNumber,
        });
      }
    }

    return parameters;
  }

  private isReferenceRange(value: string): boolean {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return false;
    }

    return (
      /^\d+(\.\d+)?\s*[-–]\s*\d+(\.\d+)?$/.test(normalized) ||
      /^(negative|positive|normal|nil)$/i.test(normalized)
    );
  }

  private normalizeOptionalValue(value?: string): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim();

    if (
      /^(missing|not stated|not provided|not available|n\/a|none|null|-)$/i.test(
        normalized,
      )
    ) {
      return null;
    }

    return normalized;
  }

  async getReportById(id: number) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        parameters: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const { filePath, fileHash, parameters, ...reportDetails } = report;

    return {
      report: reportDetails,
      parameters,
    };
  }

  async getAllReports() {
    const reports = await this.prisma.report.findMany({
      where: {
        status: 'COMPLETED',
      },
      select: {
        id: true,
        reportId: true,
        sampleId: true,
        originalFilename: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      reports,
    };
  }
}
