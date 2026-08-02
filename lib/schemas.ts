import * as z from "zod";

export const listingTypeSchema = z.enum(["LAND", "PROPERTY", "RENTAL"]);
export const listingStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "SOLD",
  "RENTED",
]);
export const orderStatusSchema = z.enum(["PENDING", "PAID", "CANCELLED"]);
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
  days: z.preprocess(
    (v) => Number(v),
    z.number().int().min(1, { error: "Must run for at least 1 day." }).max(365)
  ),
});

export const extendListingFormSchema = z.object({
  listingId: z.string().min(1),
  extraDays: z.preprocess(
    (v) => Number(v),
    z.number().int().min(1, { error: "Enter at least 1 extra day." }).max(365)
  ),
});

export const nearbySearchSchema = z.object({
  latitude: z.preprocess((v) => Number(v), z.number().min(-90).max(90)),
  longitude: z.preprocess((v) => Number(v), z.number().min(-180).max(180)),
});

export const interestFormSchema = z.object({
  listingId: z.string().min(1),
  amount: z.preprocess((v) => Number(v), z.number().nonnegative()),
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

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  // Non-blocking heads-up shown alongside a success (e.g. a requested ad
  // duration got capped to what the listing's paid days actually allow).
  notice?: string;
} | undefined;
