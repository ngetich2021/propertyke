import * as z from "zod";

export const listingTypeSchema = z.enum(["LAND", "PROPERTY", "RENTAL"]);
export const listingStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "SOLD",
  "RENTED",
  "INACTIVE",
]);
export const orderStatusSchema = z.enum(["PENDING", "UNDER_REVIEW", "CONFIRMED", "PAID", "CANCELLED"]);
export const orderContactMethodSchema = z.enum(["CALL", "SMS", "WHATSAPP", "EMAIL"]);
export const adStatusSchema = z.enum(["PENDING", "ACTIVE", "REJECTED", "EXPIRED"]);
export const reportStatusSchema = z.enum(["OPEN", "RESOLVED", "DISMISSED"]);
export const userRoleSchema = z.enum(["USER", "ADMIN"]);

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().finite().optional()
);

export const listingFormSchema = z.object({
  type: listingTypeSchema,
  title: z.string().min(3, { error: "Title must be at least 3 characters." }).max(120),
  description: z.string().min(10, { error: "Description must be at least 10 characters." }).max(4000),
  price: z.preprocess((v) => Number(v), z.number().positive({ error: "Price must be greater than 0." })),
  currency: z.string().trim().min(3).max(6).default("KES"),
  address: z.string().trim().max(200).optional(),
  latitude: optionalNumber,
  longitude: optionalNumber,
  bedrooms: optionalNumber,
  bathrooms: optionalNumber,
  acreage: optionalNumber,
  rentPerMonth: optionalNumber,
  images: z.array(z.url()).max(10).default([]),
});

export const nearbySearchSchema = z.object({
  latitude: z.preprocess((v) => Number(v), z.number().min(-90).max(90)),
  longitude: z.preprocess((v) => Number(v), z.number().min(-180).max(180)),
});

export const interestFormSchema = z.object({
  listingId: z.string().min(1),
  amount: z.preprocess((v) => Number(v), z.number().nonnegative()),
  contactPhone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,19}$/, { error: "Enter a valid phone number so the owner can reach you." }),
  contactMethod: orderContactMethodSchema,
  message: z.string().trim().max(1000).optional(),
});

export const orderStatusFormSchema = z.object({
  orderId: z.string().min(1),
  status: orderStatusSchema,
});

export const adMediaTypeSchema = z.enum(["youtube", "cloudinary"]);

export const adMediaItemSchema = z.object({
  type: adMediaTypeSchema,
  url: z.url({ error: "Enter a valid URL." }),
});

export const adTargetModeSchema = z.enum(["EVERYWHERE", "SELECT"]);

export const adFormSchema = z.object({
  listingId: z.string().min(1),
  companyName: z.string().trim().min(1, { error: "Company name is required." }).max(120),
  productName: z.string().trim().min(1, { error: "Product name is required." }).max(120),
  productDescription: z
    .string()
    .trim()
    .min(1, { error: "Product description is required." })
    .max(2000),
  companyContact: z.string().trim().min(1, { error: "Company contact is required." }).max(200),
  mediaType: z.array(adMediaTypeSchema).default([]),
  mediaUrl: z.array(z.url({ error: "One of the media entries has an invalid URL." })).default([]),
  targetMode: adTargetModeSchema.default("EVERYWHERE"),
  targetLatitude: optionalNumber,
  targetLongitude: optionalNumber,
  targetRadiusKm: optionalNumber,
  repeatEnabled: z.preprocess((v) => v === "on" || v === "true", z.boolean().default(false)),
  repeatCount: optionalNumber,
  days: z.preprocess(
    (v) => Number(v),
    z.number().int().min(1, { error: "Must run for at least 1 day." }).max(365)
  ),
});

export const adStatusFormSchema = z.object({
  adId: z.string().min(1),
  status: adStatusSchema,
  adminNote: z.string().trim().max(1000).optional(),
});

export const extendAdFormSchema = z.object({
  adId: z.string().min(1),
  extraDays: z.preprocess(
    (v) => Number(v),
    z.number().int().min(1, { error: "Enter at least 1 extra day." }).max(365)
  ),
});

export const deleteAdFormSchema = z.object({
  adId: z.string().min(1),
});

export const roleFormSchema = z.object({
  userId: z.string().min(1),
  role: userRoleSchema,
});

export const adminSectionSchema = z.enum([
  "revenue",
  "ads",
  "users",
  "lands",
  "properties",
  "housetolet",
  "reports",
  "orders",
  "support",
  "tours",
  "health",
  "feedback",
]);

export const permissionsFormSchema = z.object({
  userId: z.string().min(1),
  permissions: z.array(adminSectionSchema),
});

const roleNameSchema = z
  .string()
  .trim()
  .min(2, { error: "Name must be at least 2 characters." })
  .max(40, { error: "Name must be under 40 characters." });

export const createRoleFormSchema = z.object({
  name: roleNameSchema,
  permissions: z.array(adminSectionSchema),
});

export const updateRoleFormSchema = z.object({
  roleId: z.string().min(1),
  name: roleNameSchema,
  permissions: z.array(adminSectionSchema),
});

export const deleteRoleFormSchema = z.object({
  roleId: z.string().min(1),
});

export const assignCustomRoleFormSchema = z.object({
  userId: z.string().min(1),
  // Empty string means "no custom role" -- falls back to ad-hoc permissions.
  roleId: z.string().optional(),
});

const inviteEmailSchema = z
  .email({ error: "Enter a valid email." })
  .trim()
  .toLowerCase();

// Admin-issued staff invite (see StaffInvite in schema.prisma) -- same
// role/permissions shape as updateRole/updatePermissions above, just
// targeting an email instead of an existing userId.
export const inviteStaffFormSchema = z.object({
  email: inviteEmailSchema,
  role: userRoleSchema,
  roleId: z.string().optional(),
  permissions: z.array(adminSectionSchema),
});

export const revokeStaffInviteFormSchema = z.object({
  inviteId: z.string().min(1),
});

const ownerDutySchema = z.enum(["listings", "ads", "orders"]);

// An individual account inviting someone onto their own "Team" (see
// OwnerInvite/OwnerDelegation in schema.prisma) -- scoped to that account's
// own resources, unrelated to the admin invite/schema above.
export const inviteTeamMemberFormSchema = z.object({
  email: inviteEmailSchema,
  scopes: z.array(ownerDutySchema).min(1, { error: "Pick at least one thing they can help with." }),
});

export const revokeTeamInviteFormSchema = z.object({
  inviteId: z.string().min(1),
});

export const updateTeamMemberScopesFormSchema = z.object({
  delegationId: z.string().min(1),
  scopes: z.array(ownerDutySchema),
});

export const removeTeamMemberFormSchema = z.object({
  delegationId: z.string().min(1),
});

export const listingStatusFormSchema = z.object({
  listingId: z.string().min(1),
  status: listingStatusSchema,
});

export const reportFormSchema = z.object({
  listingId: z.string().min(1),
  reason: z.string().trim().min(5, { error: "Please describe the issue in a bit more detail." }).max(500),
});

export const reportStatusFormSchema = z.object({
  reportId: z.string().min(1),
  status: reportStatusSchema,
});

export const verificationFormSchema = z.object({
  days: z.preprocess(
    (v) => Number(v),
    z.number().int().min(1, { error: "Enter at least 1 day." }).max(365)
  ),
});

export const profileFormSchema = z.object({
  name: z.string().trim().min(2, { error: "Name must be at least 2 characters." }).max(80),
  businessName: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().min(2, { error: "Business name must be at least 2 characters." }).max(120).optional()
  ),
  phone: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z
      .string()
      .trim()
      .regex(/^[+\d][\d\s-]{6,19}$/, { error: "Enter a valid phone number." })
      .optional()
  ),
});

// Same fields as profileFormSchema (self-service, lib/actions/settings.ts)
// plus the target user -- used when an ADMIN edits someone else's profile
// from the Users panel (lib/actions/users.ts).
export const adminUpdateUserProfileFormSchema = profileFormSchema.extend({
  userId: z.string().min(1),
});

export const ticketStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
export const tourStatusSchema = z.enum(["REQUESTED", "CONFIRMED", "DECLINED", "DONE", "CANCELLED"]);

export const startTicketFormSchema = z.object({
  // `subject` is auto-derived from the first message when the chat UI
  // doesn't collect one separately (see sendChatMessage) -- min(1), not a
  // content-quality gate, since it can legitimately be as short as the
  // message itself.
  subject: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1, { error: "Say a bit more about what you need help with." }).max(2000),
});

export const ticketMessageFormSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1, { error: "Message can't be empty." }).max(2000),
});

export const assignTicketFormSchema = z.object({
  ticketId: z.string().min(1),
  assignedToId: z.preprocess((v) => (v === "" ? null : v), z.string().min(1).nullable()),
});

export const ticketStatusFormSchema = z.object({
  ticketId: z.string().min(1),
  status: ticketStatusSchema,
});

export const tourRequestFormSchema = z.object({
  listingId: z.string().min(1),
  preferredDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { error: "Pick a valid date." }),
  notes: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(500).optional()),
});

export const tourStatusFormSchema = z.object({
  tourId: z.string().min(1),
  status: tourStatusSchema,
});

export const feedbackFormSchema = z.object({
  rating: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).max(5).optional()
  ),
  message: z.string().trim().min(3, { error: "Tell us a bit more." }).max(1000),
});

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  // Non-blocking heads-up shown alongside a success (e.g. a requested ad
  // duration got capped to what the listing's paid days actually allow).
  notice?: string;
  // Set instead of `success` when a request needed money to move first --
  // the caller switches to an M-Pesa waiting screen for this payment instead
  // of treating the request as done. See lib/mpesa.ts, lib/paymentApply.ts.
  pendingPayment?: { paymentId: string; amount: number; phone: string };
} | undefined;
