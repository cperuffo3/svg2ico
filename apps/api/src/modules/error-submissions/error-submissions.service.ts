import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '../../../prisma/generated/prisma/client.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  CreateErrorSubmissionDto,
  ErrorSubmissionDetailDto,
  ErrorSubmissionSummaryDto,
  UpdateErrorSubmissionDto,
} from './dto/create-error-submission.dto.js';

const MAX_SVG_LENGTH = 10 * 1024 * 1024;
const MAX_FILENAME = 512;
const MAX_NOTES = 2000;
const MAX_ERROR_MESSAGE = 2048;

@Injectable()
export class ErrorSubmissionsService {
  private readonly logger = new Logger(ErrorSubmissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateErrorSubmissionDto, clientId: string | null): Promise<{ id: string }> {
    const svgContent = (dto.svgContent ?? '').toString();
    const originalFilename = (dto.originalFilename ?? '').toString().slice(0, MAX_FILENAME);
    const errorMessage = (dto.errorMessage ?? '').toString().slice(0, MAX_ERROR_MESSAGE);
    const errorType = (dto.errorType ?? '').toString().slice(0, 64);

    if (!svgContent || svgContent.length > MAX_SVG_LENGTH) {
      throw new BadRequestException('svgContent is required and must be at most 10MB');
    }
    if (!originalFilename) {
      throw new BadRequestException('originalFilename is required');
    }
    if (!errorMessage || !errorType) {
      throw new BadRequestException('errorMessage and errorType are required');
    }

    const userNotes = dto.userNotes ? dto.userNotes.toString().slice(0, MAX_NOTES) : null;

    const created = await this.prisma.errorSubmission.create({
      data: {
        clientIdHash: clientId ? this.hashClientId(clientId) : null,
        originalFilename,
        fileSizeBytes: Buffer.byteLength(svgContent, 'utf8'),
        svgContent,
        errorMessage,
        errorType,
        classification: dto.classification?.toString().slice(0, 128) ?? null,
        matchedPatterns: dto.matchedPatterns
          ? (dto.matchedPatterns as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        patternLocations: dto.patternLocations
          ? (dto.patternLocations as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        userNotes,
      },
      select: { id: true },
    });

    this.logger.log(`Stored error submission ${created.id} (${errorType}) for ${originalFilename}`);

    return { id: created.id };
  }

  async list(
    options: { reviewed?: boolean; limit?: number; offset?: number } = {},
  ): Promise<{ items: ErrorSubmissionSummaryDto[]; total: number }> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);
    const where = options.reviewed === undefined ? {} : { reviewed: options.reviewed };

    const [rows, total] = await Promise.all([
      this.prisma.errorSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          originalFilename: true,
          fileSizeBytes: true,
          errorType: true,
          classification: true,
          errorMessage: true,
          reviewed: true,
          createdAt: true,
        },
      }),
      this.prisma.errorSubmission.count({ where }),
    ]);

    return {
      total,
      items: rows.map((r) => ({
        id: r.id,
        originalFilename: r.originalFilename,
        fileSizeBytes: r.fileSizeBytes,
        errorType: r.errorType,
        classification: r.classification,
        errorMessage: r.errorMessage,
        reviewed: r.reviewed,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async getById(id: string): Promise<ErrorSubmissionDetailDto> {
    const row = await this.prisma.errorSubmission.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Submission not found');
    }
    return {
      id: row.id,
      originalFilename: row.originalFilename,
      fileSizeBytes: row.fileSizeBytes,
      errorType: row.errorType,
      classification: row.classification,
      errorMessage: row.errorMessage,
      reviewed: row.reviewed,
      createdAt: row.createdAt.toISOString(),
      svgContent: row.svgContent,
      matchedPatterns: (row.matchedPatterns as string[] | null) ?? null,
      patternLocations: (row.patternLocations as Array<Record<string, unknown>> | null) ?? null,
      userNotes: row.userNotes,
      reviewerNotes: row.reviewerNotes,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    };
  }

  async update(id: string, dto: UpdateErrorSubmissionDto): Promise<ErrorSubmissionDetailDto> {
    const existing = await this.prisma.errorSubmission.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Submission not found');
    }

    const reviewedChanged = dto.reviewed !== undefined && dto.reviewed !== existing.reviewed;

    await this.prisma.errorSubmission.update({
      where: { id },
      data: {
        ...(dto.reviewed !== undefined ? { reviewed: dto.reviewed } : {}),
        ...(dto.reviewerNotes !== undefined
          ? { reviewerNotes: dto.reviewerNotes ? dto.reviewerNotes.slice(0, MAX_NOTES) : null }
          : {}),
        ...(reviewedChanged && dto.reviewed ? { reviewedAt: new Date() } : {}),
        ...(reviewedChanged && !dto.reviewed ? { reviewedAt: null } : {}),
      },
    });

    return this.getById(id);
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    await this.prisma.errorSubmission.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Submission not found');
    });
    return { deleted: true };
  }

  async getStats(): Promise<{ total: number; unreviewed: number }> {
    const [total, unreviewed] = await Promise.all([
      this.prisma.errorSubmission.count(),
      this.prisma.errorSubmission.count({ where: { reviewed: false } }),
    ]);
    return { total, unreviewed };
  }

  private hashClientId(clientId: string): string {
    return createHash('sha256').update(clientId).digest('hex').substring(0, 16);
  }
}
