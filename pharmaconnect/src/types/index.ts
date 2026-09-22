export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export interface MedicineDTO {
  id: string;
  genericName: string;
  brandName: string;
  strength: string;
  manufacturer: string;
}

export interface NearbyPharmacyDTO {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  distanceKm: number;
  quantity: number;
  stockStatus: StockStatus;
  mrp: number | null;
  expiryDate: string | null;
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
  distanceKm: number | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  inStockCount: number;
  products: Array<{
    medicine: MedicineDTO;
    quantity: number;
    stockStatus: StockStatus;
    mrp: number | null;
    expiryDate: string | null;
    updatedAt: string;
  }>;
}

export interface RequestDTO {
  id: string;
  status: "PENDING" | "AVAILABLE" | "UNAVAILABLE";
  createdAt: string;
  patient: { id: string; name: string; email: string };
  pharmacy: { id: string; name: string };
  medicine: MedicineDTO;
}

export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}
