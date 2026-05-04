import z from 'zod/v3';

// Request validation schemas for BODY
export const listNotificationsSchema = z.object({
    onlyUnacknowledged: z.coerce.boolean().optional(),
});

export const createNotificationSchema = z.object({
  type: z.enum(['warning', 'info', 'danger']),
  text: z.string().trim().min(1).max(5000),
  gatewayId: z.coerce.number().int().positive().nullable(),
  isForAdminsOnly: z.boolean(),
});

// Request validation schemas for PARAMS
export const notificationIdParamsSchema = z.object({
    notificationId: z.string().regex(/^\d+$/),
});
