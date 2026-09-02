import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';

import { db, isFirebaseConfigured, firebaseConfig } from '../config/firebase';
import { DEMO_PROFILES } from '../constants/demoProfiles';
import * as seed from './seedData';
import type {
  ClassRoom,
  Area,
  Schedule,
  Inspection,
  InspectionItem,
  ViolationType,
  PenaltyRule,
  Violation,
  Penalty,
  InventoryItem,
  InventoryLog,
  TeacherClassAssignment,
  UserProfile,
  UserRole,
} from '../types';


// Storage keys for offline / fallback data
const STORAGE_KEYS = {
  classes: 'sibersih_data_classes',
  areas: 'sibersih_data_areas',
  schedules: 'sibersih_data_schedules',
  inspections: 'sibersih_data_inspections',
  inspection_items: 'sibersih_data_inspection_items',
  violation_types: 'sibersih_data_violation_types',
  penalty_rules: 'sibersih_data_penalty_rules',
  violations: 'sibersih_data_violations',
  penalties: 'sibersih_data_penalties',
  inventories: 'sibersih_data_inventories',
  inventory_logs: 'sibersih_data_inventory_logs',
  teacher_assignments: 'sibersih_data_teacher_assignments',
  users: 'sibersih_data_users',
};

// Helper to get local data or initialize with seed data
function getLocalCollection<T>(key: string, defaultData: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return defaultData;
  }
}

function setLocalCollection<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
}

/**
 * Membersihkan seluruh field bernilai undefined secara rekursif sebelum dikirim ke Cloud Firestore.
 * Firestore SDK melempar error fatal jika menemukan value `undefined`:
 * "Unsupported field value: undefined".
 */
export function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = sanitizeFirestorePayload(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as T;
}

export const DataService = {
  // ============================================================
  // CLASSES
  // ============================================================
  async getClasses(): Promise<ClassRoom[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'classes'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom));
    }
    return getLocalCollection<ClassRoom>(STORAGE_KEYS.classes, seed.INITIAL_CLASSES);
  },

  async addClass(newClass: Omit<ClassRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassRoom> {
    const item: ClassRoom = {
      ...newClass,
      id: `class-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'classes', item.id), item);
      return item;
    }
    const current = getLocalCollection<ClassRoom>(STORAGE_KEYS.classes, seed.INITIAL_CLASSES);
    const updated = [item, ...current];
    setLocalCollection(STORAGE_KEYS.classes, updated);
    return item;
  },

  async updateClass(id: string, updates: Partial<ClassRoom>): Promise<void> {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'classes', id), { ...updates, updatedAt: new Date().toISOString() });
      return;
    }
    const current = getLocalCollection<ClassRoom>(STORAGE_KEYS.classes, seed.INITIAL_CLASSES);
    const updated = current.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
    setLocalCollection(STORAGE_KEYS.classes, updated);
  },

  // ============================================================
  // AREAS
  // ============================================================
  async getAreas(): Promise<Area[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'areas'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Area));
    }
    return getLocalCollection<Area>(STORAGE_KEYS.areas, seed.INITIAL_AREAS);
  },

  async addArea(newArea: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>): Promise<Area> {
    const item: Area = {
      ...newArea,
      id: `area-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'areas', item.id), item);
      return item;
    }
    const current = getLocalCollection<Area>(STORAGE_KEYS.areas, seed.INITIAL_AREAS);
    const updated = [item, ...current];
    setLocalCollection(STORAGE_KEYS.areas, updated);
    return item;
  },

  // ============================================================
  // SCHEDULES
  // ============================================================
  async getSchedules(): Promise<Schedule[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'schedules'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Schedule));
    }
    return getLocalCollection<Schedule>(STORAGE_KEYS.schedules, seed.INITIAL_SCHEDULES);
  },

  async addSchedule(schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> {
    const item: Schedule = {
      ...schedule,
      id: `sched-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'schedules', item.id), item);
      return item;
    }
    const current = getLocalCollection<Schedule>(STORAGE_KEYS.schedules, seed.INITIAL_SCHEDULES);
    setLocalCollection(STORAGE_KEYS.schedules, [item, ...current]);
    return item;
  },

  // ============================================================
  // INSPECTIONS & INSPECTION ITEMS
  // ============================================================
  async getInspections(classId?: string): Promise<Inspection[]> {
    if (isFirebaseConfigured && db) {
      const q = classId
        ? query(collection(db, 'inspections'), where('classId', '==', classId))
        : collection(db, 'inspections');
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Inspection));
    }
    const current = getLocalCollection<Inspection>(STORAGE_KEYS.inspections, seed.INITIAL_INSPECTIONS);
    return classId ? current.filter((i) => i.classId === classId) : current;
  },

  async getInspectionItems(inspectionId: string): Promise<InspectionItem[]> {
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, 'inspection_items'), where('inspectionId', '==', inspectionId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InspectionItem));
    }
    const items = getLocalCollection<InspectionItem>(STORAGE_KEYS.inspection_items, seed.INITIAL_INSPECTION_ITEMS);
    return items.filter((i) => i.inspectionId === inspectionId);
  },

  async createInspection(
    inspectionData: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>,
    itemsData: Array<Omit<InspectionItem, 'id' | 'inspectionId' | 'createdAt'>>
  ): Promise<Inspection> {
    const inspectionId = `insp-${Date.now()}`;
    const newInspection: Inspection = {
      ...inspectionData,
      id: inspectionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newItems: InspectionItem[] = itemsData.map((item, idx) => ({
      ...item,
      id: `ii-${Date.now()}-${idx}`,
      inspectionId,
      createdAt: new Date().toISOString(),
    }));

    if (isFirebaseConfigured && db) {
      // FIX 2: Atomic writeBatch for inspection + all items
      const batch = writeBatch(db);
      batch.set(doc(db, 'inspections', inspectionId), sanitizeFirestorePayload(newInspection));
      for (const it of newItems) {
        batch.set(doc(db, 'inspection_items', it.id), sanitizeFirestorePayload(it));
      }
      await batch.commit();
      return newInspection;
    }


    const currentInspections = getLocalCollection<Inspection>(STORAGE_KEYS.inspections, seed.INITIAL_INSPECTIONS);
    setLocalCollection(STORAGE_KEYS.inspections, [newInspection, ...currentInspections]);

    const currentItems = getLocalCollection<InspectionItem>(STORAGE_KEYS.inspection_items, seed.INITIAL_INSPECTION_ITEMS);
    setLocalCollection(STORAGE_KEYS.inspection_items, [...newItems, ...currentItems]);

    return newInspection;
  },

  // ============================================================
  // VIOLATION TYPES & RULES
  // ============================================================
  async getViolationTypes(): Promise<ViolationType[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'violation_types'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ViolationType));
    }
    return getLocalCollection<ViolationType>(STORAGE_KEYS.violation_types, seed.INITIAL_VIOLATION_TYPES);
  },

  async getPenaltyRules(): Promise<PenaltyRule[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'penalty_rules'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PenaltyRule));
    }
    return getLocalCollection<PenaltyRule>(STORAGE_KEYS.penalty_rules, seed.INITIAL_PENALTY_RULES);
  },

  // ============================================================
  // VIOLATIONS
  // ============================================================
  async getViolations(classId?: string): Promise<Violation[]> {
    if (isFirebaseConfigured && db) {
      const q = classId
        ? query(collection(db, 'violations'), where('classId', '==', classId))
        : collection(db, 'violations');
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Violation));
    }
    const current = getLocalCollection<Violation>(STORAGE_KEYS.violations, seed.INITIAL_VIOLATIONS);
    return classId ? current.filter((v) => v.classId === classId) : current;
  },

  async addViolation(violationData: Omit<Violation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Violation> {
    const item: Violation = {
      ...violationData,
      status: violationData.status || 'reported',
      id: `viol-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'violations', item.id), sanitizeFirestorePayload(item));
      return item;
    }

    const current = getLocalCollection<Violation>(STORAGE_KEYS.violations, seed.INITIAL_VIOLATIONS);
    setLocalCollection(STORAGE_KEYS.violations, [item, ...current]);
    return item;
  },

  // FIX 3: Atomic creation of Violation + Penalty via writeBatch
  async createViolationWithPenalty(
    violationData: Omit<Violation, 'id' | 'createdAt' | 'updatedAt'>,
    penaltyData?: Omit<Penalty, 'id' | 'violationId' | 'createdAt' | 'updatedAt'>
  ): Promise<{ violation: Violation; penalty?: Penalty }> {
    const violationId = `viol-${Date.now()}`;
    const newViolation: Violation = {
      ...violationData,
      status: violationData.status || 'reported',
      id: violationId,
      penaltyCreated: !!penaltyData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let newPenalty: Penalty | undefined;
    if (penaltyData) {
      const penaltyId = `pen-${Date.now()}`;
      newPenalty = {
        ...penaltyData,
        id: penaltyId,
        violationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'violations', violationId), sanitizeFirestorePayload(newViolation));
      if (newPenalty) {
        batch.set(doc(db, 'penalties', newPenalty.id), sanitizeFirestorePayload(newPenalty));
      }
      await batch.commit();
      return { violation: newViolation, penalty: newPenalty };
    }

    // Offline / Demo Fallback Mode
    const currentViolations = getLocalCollection<Violation>(STORAGE_KEYS.violations, seed.INITIAL_VIOLATIONS);
    setLocalCollection(STORAGE_KEYS.violations, [newViolation, ...currentViolations]);

    if (newPenalty) {
      const currentPenalties = getLocalCollection<Penalty>(STORAGE_KEYS.penalties, seed.INITIAL_PENALTIES);
      setLocalCollection(STORAGE_KEYS.penalties, [newPenalty, ...currentPenalties]);
    }

    return { violation: newViolation, penalty: newPenalty };
  },


  // ============================================================
  // PENALTIES
  // ============================================================
  async getPenalties(classId?: string): Promise<Penalty[]> {
    if (isFirebaseConfigured && db) {
      const q = classId
        ? query(collection(db, 'penalties'), where('classId', '==', classId))
        : collection(db, 'penalties');
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penalty));
    }
    return getLocalCollection<Penalty>(STORAGE_KEYS.penalties, seed.INITIAL_PENALTIES);
  },


  async addPenalty(penaltyData: Omit<Penalty, 'id' | 'createdAt' | 'updatedAt'>): Promise<Penalty> {
    const item: Penalty = {
      ...penaltyData,
      id: `pen-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'penalties', item.id), item);
      return item;
    }

    const current = getLocalCollection<Penalty>(STORAGE_KEYS.penalties, seed.INITIAL_PENALTIES);
    setLocalCollection(STORAGE_KEYS.penalties, [item, ...current]);
    return item;
  },

  async updatePenaltyStatus(
    id: string,
    status: Penalty['status'],
    receivedById?: string,
    receiptNumber?: string
  ): Promise<void> {
    if (isFirebaseConfigured && db) {
      const penRef = doc(db, 'penalties', id);
      const penSnap = await getDoc(penRef);
      if (!penSnap.exists()) {
        throw new Error('Data denda tidak ditemukan.');
      }
      const existing = penSnap.data() as Penalty;

      // FIX 6: Prevent double payment at backend/service layer
      if (existing.status === 'paid') {
        throw new Error('Denda ini sudah dilunasi sebelumnya.');
      }
      if (existing.status === 'cancelled') {
        throw new Error('Denda yang sudah dibatalkan tidak dapat dilunasi.');
      }

      const updates: Partial<Penalty> = {
        status,
        updatedAt: new Date().toISOString(),
        ...(status === 'paid' && {
          paidAt: existing.paidAt || new Date().toISOString(),
          paidReceivedById: existing.paidReceivedById || receivedById,
          receiptNumber: existing.receiptNumber || receiptNumber || `RCP-${Date.now()}`,
        }),
      };

      await updateDoc(penRef, updates);
      return;
    }

    // Offline / Demo Fallback Mode
    const current = getLocalCollection<Penalty>(STORAGE_KEYS.penalties, seed.INITIAL_PENALTIES);
    const existing = current.find((p) => p.id === id);
    if (!existing) {
      throw new Error('Data denda tidak ditemukan.');
    }

    // FIX 6: Prevent double payment at backend/service layer
    if (existing.status === 'paid') {
      throw new Error('Denda ini sudah dilunasi sebelumnya.');
    }
    if (existing.status === 'cancelled') {
      throw new Error('Denda yang sudah dibatalkan tidak dapat dilunasi.');
    }

    const updates: Partial<Penalty> = {
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'paid' && {
        paidAt: existing.paidAt || new Date().toISOString(),
        paidReceivedById: existing.paidReceivedById || receivedById,
        receiptNumber: existing.receiptNumber || receiptNumber || `RCP-${Date.now()}`,
      }),
    };

    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setLocalCollection(STORAGE_KEYS.penalties, updated);
  },

  async cancelPenalty(
    penaltyId: string,
    cancelledById: string,
    cancelledByName: string,
    cancellationReason: string
  ): Promise<{ penalty: Penalty; violation?: Violation }> {
    const trimmedReason = (cancellationReason || '').trim();
    if (!trimmedReason) {
      throw new Error('Alasan pembatalan denda wajib diisi.');
    }

    const now = new Date().toISOString();

    if (isFirebaseConfigured && db) {
      const penRef = doc(db, 'penalties', penaltyId);
      const penSnap = await getDoc(penRef);
      if (!penSnap.exists()) {
        throw new Error('Data denda tidak ditemukan.');
      }
      const existingPenalty = penSnap.data() as Penalty;

      if (existingPenalty.status === 'cancelled') {
        throw new Error('Denda ini sudah dibatalkan sebelumnya.');
      }

      const updatedPenalty: Penalty = {
        ...existingPenalty,
        status: 'cancelled',
        cancelledAt: now,
        cancelledById,
        cancelledByName,
        cancellationReason: trimmedReason,
        updatedAt: now,
      };

      let updatedViolation: Violation | undefined;
      const batch = writeBatch(db);
      batch.update(
        penRef,
        sanitizeFirestorePayload({
          status: 'cancelled',
          cancelledAt: now,
          cancelledById,
          cancelledByName,
          cancellationReason: trimmedReason,
          updatedAt: now,
        })
      );

      if (existingPenalty.violationId) {
        const violRef = doc(db, 'violations', existingPenalty.violationId);
        const violSnap = await getDoc(violRef);
        if (violSnap.exists()) {
          const existingViolation = violSnap.data() as Violation;
          updatedViolation = {
            ...existingViolation,
            status: 'cancelled',
            cancelledAt: now,
            cancelledById,
            cancelledByName,
            cancellationReason: trimmedReason,
            updatedAt: now,
          };
          batch.update(
            violRef,
            sanitizeFirestorePayload({
              status: 'cancelled',
              cancelledAt: now,
              cancelledById,
              cancelledByName,
              cancellationReason: trimmedReason,
              updatedAt: now,
            })
          );
        }
      }

      await batch.commit();
      return { penalty: updatedPenalty, violation: updatedViolation };
    }

    // Offline / Demo Fallback Mode
    const currentPenalties = getLocalCollection<Penalty>(STORAGE_KEYS.penalties, seed.INITIAL_PENALTIES);
    const existingPenalty = currentPenalties.find((p) => p.id === penaltyId);
    if (!existingPenalty) {
      throw new Error('Data denda tidak ditemukan.');
    }
    if (existingPenalty.status === 'cancelled') {
      throw new Error('Denda ini sudah dibatalkan sebelumnya.');
    }

    const updatedPenalty: Penalty = {
      ...existingPenalty,
      status: 'cancelled',
      cancelledAt: now,
      cancelledById,
      cancelledByName,
      cancellationReason: trimmedReason,
      updatedAt: now,
    };

    const newPenalties = currentPenalties.map((p) => (p.id === penaltyId ? updatedPenalty : p));
    setLocalCollection(STORAGE_KEYS.penalties, newPenalties);

    let updatedViolation: Violation | undefined;
    if (existingPenalty.violationId) {
      const currentViolations = getLocalCollection<Violation>(STORAGE_KEYS.violations, seed.INITIAL_VIOLATIONS);
      const existingViolation = currentViolations.find((v) => v.id === existingPenalty.violationId);
      if (existingViolation) {
        updatedViolation = {
          ...existingViolation,
          status: 'cancelled',
          cancelledAt: now,
          cancelledById,
          cancelledByName,
          cancellationReason: trimmedReason,
          updatedAt: now,
        };
        const newViolations = currentViolations.map((v) =>
          v.id === existingPenalty.violationId ? updatedViolation! : v
        );
        setLocalCollection(STORAGE_KEYS.violations, newViolations);
      }
    }

    return { penalty: updatedPenalty, violation: updatedViolation };
  },


  // ============================================================
  // INVENTORIES & LOGS
  // ============================================================
  async getInventories(): Promise<InventoryItem[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'inventories'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));
    }
    return getLocalCollection<InventoryItem>(STORAGE_KEYS.inventories, seed.INITIAL_INVENTORIES);
  },

  async getInventoryLogs(): Promise<InventoryLog[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'inventory_logs'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryLog));
    }
    return getLocalCollection<InventoryLog>(STORAGE_KEYS.inventory_logs, seed.INITIAL_INVENTORY_LOGS);
  },

  // FIX 1: Atomic update of inventory stock and logs via runTransaction
  async updateInventoryStock(
    inventoryId: string,
    action: InventoryLog['action'],
    quantityChanged: number,
    userId: string,
    userName: string,
    notes?: string
  ): Promise<void> {
    if (isFirebaseConfigured && db) {
      const invRef = doc(db, 'inventories', inventoryId);
      const logId = `log-${Date.now()}`;
      const logRef = doc(db, 'inventory_logs', logId);

      await runTransaction(db, async (transaction) => {
        const invSnap = await transaction.get(invRef);
        if (!invSnap.exists()) {
          throw new Error('Barang inventaris tidak ditemukan di database.');
        }
        const invData = invSnap.data() as InventoryItem;
        const previousStock = invData.stock;
        const newStock = previousStock + quantityChanged;

        // Constraint: Stock cannot become negative
        if (newStock < 0) {
          throw new Error(
            `Stok tidak mencukupi! Sisa stok saat ini: ${previousStock} ${invData.unit}, permintaan: ${Math.abs(quantityChanged)} ${invData.unit}.`
          );
        }

        const log: InventoryLog = {
          id: logId,
          inventoryId,
          inventoryName: invData.name,
          action,
          quantityChanged,
          previousStock,
          newStock,
          performedById: userId,
          performedByName: userName,
          notes,
          createdAt: new Date().toISOString(),
        };

        transaction.update(invRef, {
          stock: newStock,
          updatedAt: new Date().toISOString(),
        });
        transaction.set(logRef, log);
      });
      return;
    }

    // Offline / Demo Fallback Mode
    const items = await this.getInventories();
    const target = items.find((i) => i.id === inventoryId);
    if (!target) throw new Error('Barang inventaris tidak ditemukan');

    const previousStock = target.stock;
    const newStock = previousStock + quantityChanged;

    if (newStock < 0) {
      throw new Error(
        `Stok tidak mencukupi! Sisa stok saat ini: ${previousStock} ${target.unit}, permintaan: ${Math.abs(quantityChanged)} ${target.unit}.`
      );
    }

    const log: InventoryLog = {
      id: `log-${Date.now()}`,
      inventoryId,
      inventoryName: target.name,
      action,
      quantityChanged,
      previousStock,
      newStock,
      performedById: userId,
      performedByName: userName,
      notes,
      createdAt: new Date().toISOString(),
    };

    const updatedItems = items.map((i) =>
      i.id === inventoryId ? { ...i, stock: newStock, updatedAt: new Date().toISOString() } : i
    );
    setLocalCollection(STORAGE_KEYS.inventories, updatedItems);

    const logs = getLocalCollection<InventoryLog>(STORAGE_KEYS.inventory_logs, seed.INITIAL_INVENTORY_LOGS);
    setLocalCollection(STORAGE_KEYS.inventory_logs, [log, ...logs]);
  },


  // ============================================================
  // TEACHER ASSIGNMENTS
  // ============================================================
  async getTeacherAssignments(teacherId?: string): Promise<TeacherClassAssignment[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'teacher_class_assignments'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherClassAssignment));
      return teacherId ? list.filter((a) => a.teacherId === teacherId) : list;
    }
    const list = getLocalCollection<TeacherClassAssignment>(
      STORAGE_KEYS.teacher_assignments,
      seed.INITIAL_TEACHER_ASSIGNMENTS
    );
    return teacherId ? list.filter((a) => a.teacherId === teacherId) : list;
  },

  // ============================================================
  // PRODUCTION MASTER DATA INITIALIZATION (IDEMPOTENT & SAFE)
  // ============================================================
  async seedInitialDataToFirestore(): Promise<{
    success: boolean;
    message: string;
    createdCount: number;
    skippedCount: number;
    errorCount: number;
  }> {
    if (!isFirebaseConfigured || !db) {
      return {
        success: false,
        message: 'Firebase belum terkonfigurasi. Silakan isi credential di file .env terlebih dahulu.',
        createdCount: 0,
        skippedCount: 0,
        errorCount: 0,
      };
    }

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Helper: Hanya tulis jika dokumen belum ada di Firestore
    const seedIfMissing = async (collectionName: string, docId: string, data: any) => {
      try {
        const docRef = doc(db!, collectionName, docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          skippedCount++;
        } else {
          await setDoc(docRef, data);
          createdCount++;
        }
      } catch (err) {
        console.error(`Gagal inisialisasi dokumen ${collectionName}/${docId}:`, err);
        errorCount++;
      }
    };

    try {
      // 1. Classes: Gunakan PRODUCTION_MASTER_CLASSES (Tanpa mock demo-teacher-uid)
      for (const item of seed.PRODUCTION_MASTER_CLASSES) {
        await seedIfMissing('classes', item.id, item);
      }

      // 2. Areas: Master area / lokasi pesantren
      for (const item of seed.INITIAL_AREAS) {
        await seedIfMissing('areas', item.id, item);
      }

      // 3. Violation Types: Master kategori pelanggaran kebersihan
      for (const item of seed.INITIAL_VIOLATION_TYPES) {
        await seedIfMissing('violation_types', item.id, item);
      }

      // 4. Penalty Rules: Master tarif & sanksi denda
      for (const item of seed.INITIAL_PENALTY_RULES) {
        await seedIfMissing('penalty_rules', item.id, item);
      }

      // 5. Inventories: Master barang kebersihan (tidak akan menimpa stok existing)
      for (const item of seed.INITIAL_INVENTORIES) {
        await seedIfMissing('inventories', item.id, item);
      }

      // CATATAN KEAMANAN PRODUCTION:
      // Data operasional fiktif DILARANG di-seed ke database production:
      // - inspections (insp-101, insp-102) -> TIDAK DI-SEED
      // - inspection_items (ii-1 s/d ii-4) -> TIDAK DI-SEED
      // - violations (viol-1) -> TIDAK DI-SEED
      // - penalties (pen-1) -> TIDAK DI-SEED
      // - inventory_logs (log-1, log-2) -> TIDAK DI-SEED
      // - teacher_class_assignments dengan mock demo UID -> TIDAK DI-SEED
      // - schedules dengan mock demo-cleaner-uid -> TIDAK DI-SEED

      const summaryMessage = `Inisialisasi selesai: ${createdCount} data master dibuat, ${skippedCount} data dilewati karena sudah ada.${
        errorCount > 0 ? ` (${errorCount} data mengalami kendala).` : ''
      }`;

      return {
        success: errorCount === 0,
        message: summaryMessage,
        createdCount,
        skippedCount,
        errorCount,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Gagal inisialisasi master data: ${error?.message || error}`,
        createdCount,
        skippedCount,
        errorCount: errorCount + 1,
      };
    }
  },

  // ============================================================
  // USER MANAGEMENT
  // ============================================================
  async getUsers(): Promise<UserProfile[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map((d) => ({ ...d.data() } as UserProfile));
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return getLocalCollection<UserProfile>(STORAGE_KEYS.users, [
      DEMO_PROFILES.admin,
      DEMO_PROFILES.cleaner,
      DEMO_PROFILES.teacher,
      {
        uid: 'user-cleaner-2',
        email: 'joko.kebersihan@sibersih.id',
        displayName: 'Pak Joko (Petugas Shift Siang)',
        role: 'cleaner',
        phoneNumber: '081399887766',
        isActive: true,
        createdAt: '2026-08-10T08:00:00Z',
        updatedAt: '2026-08-10T08:00:00Z',
      },
      {
        uid: 'user-teacher-2',
        email: 'ustadzah.nurul@sibersih.id',
        displayName: 'Ustadzah Nurul Latifah',
        role: 'teacher',
        phoneNumber: '085811223344',
        isActive: true,
        createdAt: '2026-08-10T08:00:00Z',
        updatedAt: '2026-08-10T08:00:00Z',
      },
    ]);
  },

  async createUserAccount(params: {
    displayName: string;
    email: string;
    password: string;
    role: UserRole;
    phoneNumber?: string;
  }): Promise<UserProfile> {
    const trimmedEmail = params.email.trim();
    const trimmedName = params.displayName.trim();
    const trimmedPhone = params.phoneNumber?.trim() || undefined;

    if (!isFirebaseConfigured || !db) {
      // Mode offline / demo preview
      const mockUid = `user-${Date.now()}`;
      const mockProfile: UserProfile = {
        uid: mockUid,
        email: trimmedEmail,
        displayName: trimmedName,
        role: params.role,
        phoneNumber: trimmedPhone,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const existing = await this.getUsers();
      setLocalCollection(STORAGE_KEYS.users, [mockProfile, ...existing]);
      return mockProfile;
    }

    // FIREBASE LIVE: Instance Auth Sekunder agar sesi Admin yang sedang login TIDAK logout
    const secondaryAppName = `SecondaryAuth-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    let newUid: string;
    let newAuthUser: any;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        trimmedEmail,
        params.password
      );
      newAuthUser = userCredential.user;
      newUid = newAuthUser.uid;
    } catch (authError: any) {
      try {
        await deleteApp(secondaryApp);
      } catch {}

      if (authError?.code === 'auth/email-already-in-use') {
        throw new Error('Email ini sudah terdaftar di Firebase Authentication. Gunakan email lain.');
      }
      if (authError?.code === 'auth/invalid-email') {
        throw new Error('Format email tidak valid.');
      }
      if (authError?.code === 'auth/weak-password') {
        throw new Error('Kata sandi terlalu lemah. Minimal 6 karakter.');
      }
      throw new Error(`Gagal membuat akun Firebase Authentication: ${authError?.message || authError}`);
    }

    // Tulis dokumen profil ke Cloud Firestore users/{newUid} menggunakan instance Firestore utama (konteks Admin)
    const newProfile: UserProfile = {
      uid: newUid,
      email: trimmedEmail,
      displayName: trimmedName,
      role: params.role,
      ...(trimmedPhone ? { phoneNumber: trimmedPhone } : {}),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const userDocRef = doc(db, 'users', newUid);
      await setDoc(userDocRef, sanitizeFirestorePayload(newProfile));
    } catch (firestoreError: any) {
      // Rollback: Hapus akun Auth sekunder jika gagal menulis profil Firestore
      try {
        await newAuthUser.delete();
      } catch (cleanupErr) {
        console.error('[Rollback Warning] Gagal menghapus akun Auth saat rollback Firestore:', cleanupErr);
      }
      throw new Error(
        `Akun autentikasi sempat dibuat namun gagal menyimpan profil ke Firestore: ${
          firestoreError?.message || firestoreError
        }. Akun telah di-rollback.`
      );
    } finally {
      // Selalu lakukan sign-out dan hapus instance app sekunder
      try {
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
      } catch (cleanupErr) {
        console.warn('Pembersihan secondary Firebase app selesai dengan catatan:', cleanupErr);
      }
    }

    return newProfile;
  },
};
