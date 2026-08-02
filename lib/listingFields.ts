import type { ListingType } from "@/app/generated/prisma/client";

// LAND, PROPERTY (a developed plot -- land + house, for sale), and RENTAL
// (a house to let) are distinct entities with different applicable fields,
// not the same shape with optional extras:
//   LAND     -- acreage only
//   PROPERTY -- acreage (the land) + bedrooms/bathrooms (the house)
//   RENTAL   -- bedrooms/bathrooms + rentPerMonth, no acreage
// A listing's `type` alone must always determine which of these apply --
// never the mere presence of a value -- so a listing edited from one type
// to another can't keep displaying like its old type (e.g. still showing
// "/ month" pricing after being switched from RENTAL to PROPERTY).
export function normalizeListingFields<
  T extends {
    acreage?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    rentPerMonth?: number | null;
  },
>(type: ListingType, fields: T) {
  return {
    acreage: type === "LAND" || type === "PROPERTY" ? (fields.acreage ?? null) : null,
    bedrooms: type === "PROPERTY" || type === "RENTAL" ? (fields.bedrooms ?? null) : null,
    bathrooms: type === "PROPERTY" || type === "RENTAL" ? (fields.bathrooms ?? null) : null,
    rentPerMonth: type === "RENTAL" ? (fields.rentPerMonth ?? null) : null,
  };
}
