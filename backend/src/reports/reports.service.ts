import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

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

    // 8. Save the PDF
    await writeFile(filePath, file.buffer);

    const report = await this.prisma.report.create({
      data: {
        reportId: null,
        originalFilename: file.originalname,
        fileHash,
        filePath,
        status: 'PENDING',
      },
    });

    return {
      message: 'PDF uploaded and saved successfully.',
      report,
    };
  }
}
