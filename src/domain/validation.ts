import { z } from "zod";

export const parsedShiftDraftSchema = z.object({
  temporaryId: z.string().min(1),
  employeeName: z.string().min(1),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  departmentLabel: z.string().min(1),
  sourceConfidence: z.enum(["high", "medium", "low"]),
  sourceNotes: z.string().optional(),
  ignored: z.boolean().optional()
});

export const parsedScheduleDraftSchema = z.object({
  sourceFileName: z.string().min(1),
  dateRangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateRangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shifts: z.array(parsedShiftDraftSchema),
  warnings: z.array(z.string())
});
