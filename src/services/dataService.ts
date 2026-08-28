import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';

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
      batch.set(doc(db, 'inspections', inspectionId), newInspection);
      for (const it of newItems) {
        batch.set(doc(db, 'inspection_items', it.id), it);
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
      id: `viol-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'violations', item.id), item);
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
      batch.set(doc(db, 'violations', violationId), newViolation);
      if (newPenalty) {
        batch.set(doc(db, 'penalties', newPenalty.id), newPenalty);
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
    const updates: Partial<Penalty> = {
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'paid' && {
        paidAt: new Date().toISOString(),
        paidReceivedById: receivedById,
        receiptNumber: receiptNumber || `RCP-${Date.now()}`,
      }),
    };

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'penalties', id), updates);
      return;
    }

    const current = getLocalCollection<Penalty>(STORAGE_KEYS.penalties, seed.INITIAL_PENALTIES);
    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setLocalCollection(STORAGE_KEYS.penalties, updated);
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
  // SEED TO FIRESTORE UTILITY
  // ============================================================
  async seedInitialDataToFirestore(): Promise<{ success: boolean; message: string }> {
    if (!isFirebaseConfigured || !db) {
      return {
        success: false,
        message: 'Firebase belum terkonfigurasi. Silakan isi credential di file .env terlebih dahulu.',
      };
    }

    try {
      // 1. Classes
      for (const item of seed.INITIAL_CLASSES) {
        await setDoc(doc(db, 'classes', item.id), item);
      }
      // 2. Areas
      for (const item of seed.INITIAL_AREAS) {
        await setDoc(doc(db, 'areas', item.id), item);
      }
      // 3. Schedules
      for (const item of seed.INITIAL_SCHEDULES) {
        await setDoc(doc(db, 'schedules', item.id), item);
      }
      // 4. Violation types
      for (const item of seed.INITIAL_VIOLATION_TYPES) {
        await setDoc(doc(db, 'violation_types', item.id), item);
      }
      // 5. Penalty rules
      for (const item of seed.INITIAL_PENALTY_RULES) {
        await setDoc(doc(db, 'penalty_rules', item.id), item);
      }
      // 6. Inspections & items
      for (const item of seed.INITIAL_INSPECTIONS) {
        await setDoc(doc(db, 'inspections', item.id), item);
      }
      for (const item of seed.INITIAL_INSPECTION_ITEMS) {
        await setDoc(doc(db, 'inspection_items', item.id), item);
      }
      // 7. Violations & Penalties
      for (const item of seed.INITIAL_VIOLATIONS) {
        await setDoc(doc(db, 'violations', item.id), item);
      }
      for (const item of seed.INITIAL_PENALTIES) {
        await setDoc(doc(db, 'penalties', item.id), item);
      }
      // 8. Inventories
      for (const item of seed.INITIAL_INVENTORIES) {
        await setDoc(doc(db, 'inventories', item.id), item);
      }
      for (const item of seed.INITIAL_INVENTORY_LOGS) {
        await setDoc(doc(db, 'inventory_logs', item.id), item);
      }
      // 9. Teacher Assignments
      for (const item of seed.INITIAL_TEACHER_ASSIGNMENTS) {
        await setDoc(doc(db, 'teacher_class_assignments', item.id), item);
        await setDoc(doc(db, 'teacher_class_assignments', `${item.teacherId}_${item.classId}`), item);
      }


      return {
        success: true,
        message: 'Berhasil mengunggah data inisial lengkap ke Cloud Firestore!',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Gagal sinkronisasi data ke Firestore: ${error?.message || error}`,
      };
    }
  },
};
