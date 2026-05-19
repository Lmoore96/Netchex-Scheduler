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

export const positionDefinitionSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0),
  capacityMode: z.enum(["single", "multiple"])
});

export const positionListRequestSchema = z.object({
  departmentId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  positions: z.array(positionDefinitionSchema).min(1).max(100)
}).superRefine((value, context) => {
  const keys = new Set<string>();
  const sortOrders = new Set<number>();

  value.positions.forEach((position, index) => {
    if (keys.has(position.key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Position keys must be unique",
        path: ["positions", index, "key"]
      });
    }
    keys.add(position.key);

    if (sortOrders.has(position.sortOrder)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Position sort orders must be unique",
        path: ["positions", index, "sortOrder"]
      });
    }
    sortOrders.add(position.sortOrder);
  });
});

export const assignmentRequestSchema = z.object({
  dailyPositionPlanId: z.string().trim().min(1).max(120),
  assignments: z.array(z.object({
    shiftId: z.string().trim().min(1).max(120),
    positionKey: z.string().trim().min(1).max(80),
    sortOrder: z.number().int().min(0),
    notes: z.string().trim().max(500).optional()
  })).max(500)
}).superRefine((value, context) => {
  const shiftIds = new Set<string>();

  value.assignments.forEach((assignment, index) => {
    if (shiftIds.has(assignment.shiftId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assignments must be unique by shift",
        path: ["assignments", index, "shiftId"]
      });
    }
    shiftIds.add(assignment.shiftId);
  });
});
