import z from 'zod/v3';
//Schemas

// Collection

export const collectTelemetrySchema = z.object({
  remoteId: z.string().regex(/^\d+$/, 'Remote ID must contain only digits'),
  measuredAtUtc: z.string().datetime(),
  temperature: z.number().finite(),
  pressure: z.number().finite(),
  humidity: z.number().gte(0).lte(100),
  lighting: z.number().gte(0),
  raindropsAmount: z.number().int().nonnegative(),
  nodeBatteryLevel: z.number().int().gte(0).lte(100).optional(),
  nodeWifiStrength: z.number().int().optional(),
});

// Telemetry

export const getCurrentConditionsSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});

export const streamCurrentConditionsSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});

export const getTelemetryHistorySchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
  query: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    limit: z.coerce.number().int().min(1).max(5000).default(500),
  }).refine((v) => new Date(v.from) < new Date(v.to), {
    message: 'from must be before to',
  }),
});

export const getTrendsSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
  query: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    bucket: z.enum(['5m', '15m', '1h', '6h', '1d']),
  }).refine((v) => new Date(v.from) < new Date(v.to), {
    message: 'from must be before to',
  }),
});

export const getSimplePredictionSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
  query: z.object({
    horizonHours: z.coerce.number().int().min(1).max(24).default(6),
    basedOnHours: z.coerce.number().int().min(6).max(168).default(24),
  }),
});


// Auth
export const loginUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

export const logoutUserSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

// ---

// Gateways
export const listGatewaysSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
});

export const createGatewaySchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
  location: z.string().trim().min(1).max(255),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});

export const getSpecificGatewaySchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});

export const updateGatewaySchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    location: z.string().trim().min(1).max(255).optional(),
    latitude: z.number().gte(-90).lte(90).optional(),
    longitude: z.number().gte(-180).lte(180).optional(),
  }).refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  }),
});

export const rotateGatewaySecretSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});

export const deleteGatewaySchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});

// --- 


// Invites
export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    'guest',
    'operator',
    'supervisor',
    'administrator',
  ]),
});

export const registerFromInviteUserSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
  nickname: z.string().trim().min(1).max(255),
});

// ---

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});


// Users
export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['guest', 'operator', 'supervisor', 'administrator']).optional(),
  search: z.string().trim().max(255).optional(),
});

export const getSpecificUserSchema = z.object({
  params: z.object({
    userId: z.string().regex(/^\d+$/),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    userId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    role: z.enum(['guest', 'operator', 'supervisor', 'administrator']),
  }),
});

// ---

export const updateLoggedInUserSchema = z.object({
    email: z.string().email(),
    nickname: z.string().min(2).max(64),
});

export const getNotificationsSchema = z.object({
  onlyUnacknowledged: z.coerce.boolean().optional(),
});

export const acknowledgeNotificationSchema = z.object({
  params: z.object({
    notificationId: z.string().regex(/^\d+$/),
  }),
});

export const createSystemNotificationSchema = z.object({
  type: z.enum(['warning', 'info', 'danger']),
  text: z.string().trim().min(1).max(5000),
  gatewayId: z.string().regex(/^\d+$/).nullable(),
  isForAdminsOnly: z.boolean(),
});