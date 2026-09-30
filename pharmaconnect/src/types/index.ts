export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";
export type Plan = "FREE" | "VERIFIED" | "FEATURED";

export interface PaginationDTO {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface MedicineDTO {
  id: string;
  genericName: string;
  brandName: string;
  strength: string;
  manufacturer: string;
  imageUrl?: string | null;
}

export interface BranchDTO {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

/**
 * A search hit is a *branch*, not a chain: `id` is the Location id, so a chain
 * with three branches shows three separate cards and three map pins.
 */
export interface NearbyPharmacyDTO {
  id: string;
  pharmacyId: string;
  name: string;
  branchName: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  /** Effective plan tier, after expiry is applied. FEATURED results are labelled as sponsored. */
  plan: Plan;
  sponsored: boolean;
  distanceKm: number;
  quantity: number;
  stockStatus: StockStatus;
  mrp: number | null;
  expiryDate: string | null;
  stockUpdatedAt: string | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  medicine: MedicineDTO;
}

export interface PharmacyImageDTO {
  id: string;
  kind: "PROFILE" | "COVER";
  url: string;
}

export interface PharmacyStorefrontDTO {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  plan: Plan;
  distanceKm: number | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  inStockCount: number;
  branches: BranchDTO[];
  products: Array<{
    medicine: MedicineDTO;
    quantity: number;
    stockStatus: StockStatus;
    mrp: number | null;
    expiryDate: string | null;
    updatedAt: string;
    /** Which branch holds this stock. */
    locationId: string;
    locationName: string;
  }>;
}

export interface RequestDTO {
  id: string;
  status: "PENDING" | "AVAILABLE" | "UNAVAILABLE";
  createdAt: string;
  patient: { id: string; name: string; email: string };
  pharmacy: { id: string; name: string };
  location: BranchDTO;
  medicine: MedicineDTO;
  /** Only set once a moderator has approved the image. */
  prescriptionUrl: string | null;
}

export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}
