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
  distanceKm: number;
  quantity: number;
  stockStatus: StockStatus;
  medicine: MedicineDTO;
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
