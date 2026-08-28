/**
 * SIBERSIH System Architecture Types
 * Aligned with Firestore Collections & Role Models
 */

// ============================================================
// USER & ROLE MODELS
// ============================================================

export type UserRole = 'admin' | 'cleaner' | 'teacher';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string; // ISO 8601 string or Firestore Timestamp
  updatedAt: string;
}

// ============================================================
// ACADEMIC & CLASS MODELS
// ============================================================

export interface ClassRoom {
  id: string;
  name: string; // e.g. "X IPA 1", "VII A"
  grade: string; // e.g. "10", "7"
  building?: string;
  homeroomTeacherId?: string; // UID of assigned Ustadz/Ustadzah
  homeroomTeacherName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherClassAssignment {
  id: string;
  teacherId: string; // UID of Ustadz/Ustadzah
  teacherName: string;
  classId: string;
  className: string;
  academicYear: string; // e.g. "2025/2026"
  assignedAt: string;
}

// ============================================================
// AREA & SCHEDULE MODELS
// ============================================================

export type AreaCategory = 'class' | 'bathroom' | 'hallway' | 'canteen' | 'yard' | 'office' | 'prayer_room' | 'other';

export interface Area {
  id: string;
  name: string; // e.g. "Ruang Kelas X IPA 1", "Toilet Putra Lantai 1"
  category: AreaCategory;
  classId?: string; // linked if category is 'class'
  building: string;
  floor: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleFrequency = 'daily' | 'weekly' | 'custom';

export interface Schedule {
  id: string;
  areaId: string;
  areaName: string;
  assignedCleanerId?: string; // UID of Bagian Kebersihan
  assignedCleanerName?: string;
  frequency: ScheduleFrequency;
  timeSlot: string; // e.g. "07:00 - 07:30", "15:00 - 15:30"
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// INSPECTION & CHECKLIST MODELS
// ============================================================

export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type CleanlinessGrade = 'clean' | 'moderate' | 'dirty' | 'critical';

export interface Inspection {
  id: string;
  areaId: string;
  areaName: string;
  classId?: string;
  scheduleId?: string;
  inspectorId: string; // UID of Bagian Kebersihan
  inspectorName: string;
  date: string; // YYYY-MM-DD
  status: InspectionStatus;
  overallGrade?: CleanlinessGrade;
  totalScore?: number; // 0 - 100
  notes?: string;
  hasViolations: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionItem {
  id: string;
  inspectionId: string;
  itemName: string; // e.g. "Lantai", "Meja & Kursi", "Papan Tulis", "Tempat Sampah"
  passed: boolean;
  score?: number; // 0 - 100 or weighted
  notes?: string;
  photoEvidenceId?: string;
  createdAt: string;
}

// ============================================================
// VIOLATIONS & PENALTIES MODELS
// ============================================================

export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ViolationType {
  id: string;
  name: string; // e.g. "Sampah Menumpuk", "Coretan Meja", "Lantai Basah Licin"
  description?: string;
  severity: ViolationSeverity;
  defaultPenaltyAmount?: number; // IDR
  isActive: boolean;
  createdAt: string;
}

export interface PenaltyRule {
  id: string;
  violationTypeId: string;
  violationTypeName: string;
  minOccurrences: number;
  fineAmount: number; // in IDR
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface Violation {
  id: string;
  inspectionId?: string;
  areaId: string;
  areaName: string;
  classId?: string;
  className?: string;
  violationTypeId: string;
  violationTypeName: string;
  severity: ViolationSeverity;
  description: string;
  reportedById: string;
  reportedByName: string;
  date: string; // YYYY-MM-DD
  photoUrls: string[];
  penaltyCreated: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PenaltyStatus = 'pending' | 'paid' | 'waived';

export interface Penalty {
  id: string;
  violationId: string;
  classId?: string;
  className?: string;
  responsiblePerson?: string; // student or class PIC
  amount: number; // in IDR
  reason: string;
  status: PenaltyStatus;
  issuedById: string;
  issuedByName: string;
  issuedDate: string;
  paidAt?: string;
  paidReceivedById?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// PHOTO EVIDENCE & STORAGE
// ============================================================

export interface PhotoEvidence {
  id: string;
  referenceType: 'inspection' | 'violation' | 'inventory';
  referenceId: string;
  storagePath: string;
  downloadUrl: string;
  caption?: string;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

// ============================================================
// INVENTORY & LOGS MODELS
// ============================================================

export type InventoryCondition = 'good' | 'damaged' | 'lost' | 'needs_replacement';

export interface InventoryItem {
  id: string;
  name: string; // e.g. "Sapu Lantai", "Pel Jepit", "Cairan Karbol"
  category: 'tool' | 'chemical' | 'consumable';
  stock: number;
  unit: string; // e.g. "pcs", "botol", "kotak"
  condition: InventoryCondition;
  location: string; // e.g. "Gudang Kebersihan Lt. 1"
  minStockAlert: number;
  lastRestockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InventoryAction = 'restock' | 'use' | 'damage_report' | 'adjustment';

export interface InventoryLog {
  id: string;
  inventoryId: string;
  inventoryName: string;
  action: InventoryAction;
  quantityChanged: number; // + or -
  previousStock: number;
  newStock: number;
  performedById: string;
  performedByName: string;
  notes?: string;
  createdAt: string;
}
