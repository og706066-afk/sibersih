import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  AlertTriangle,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react';

import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Select,
  Textarea,
  LoadingState,
  EmptyState,
} from '../../components/common';
import { DataService } from '../../services/dataService';
import { useAuth } from '../../contexts/AuthContext';
import type {
  Area,
  ClassRoom,
  Inspection,
  InspectionItem,
  Violation,
  Penalty,
  ViolationType,
  PenaltyRule,
  ViolationSeverity,
  CleanlinessGrade,
} from '../../types';

interface ChecklistFormItem {
  id?: string;
  name: string;
  passed: boolean;
  score: number;
  notes: string;
}

// ============================================================
// STANDAR SISTEM SKORING SIBERSIH
// Lolos = 100 | Gagal = 40
// Threshold: >=85 Bersih, 75-84 Cukup, 60-74 Kotor, <60 Kritis
// ============================================================
export const CHECKLIST_PASS_SCORE = 100;
export const CHECKLIST_FAIL_SCORE = 40;

export const calculateInspectionScore = (items: Array<{ score: number }>): number => {
  if (!items || items.length === 0) return 0;
  const total = items.reduce((acc, curr) => acc + curr.score, 0);
  return Math.round(total / items.length);
};

export const getCleanlinessGrade = (score: number): CleanlinessGrade => {
  if (score >= 85) return 'clean';
  if (score >= 75) return 'moderate';
  if (score >= 60) return 'dirty';
  return 'critical';
};

const DEFAULT_CHECKLIST_TEMPLATE: ChecklistFormItem[] = [
  { name: 'Kebersihan Lantai & Sudut Ruang', passed: true, score: CHECKLIST_PASS_SCORE, notes: '' },
  { name: 'Kerapian Meja & Kolong Kursi', passed: true, score: CHECKLIST_PASS_SCORE, notes: '' },
  { name: 'Papan Tulis & Penghapus Bersih', passed: true, score: CHECKLIST_PASS_SCORE, notes: '' },
  { name: 'Tempat Sampah Kosong & Berplastik', passed: true, score: CHECKLIST_PASS_SCORE, notes: '' },
  { name: 'Jendela, Pintu & Ventilasi Udara', passed: true, score: CHECKLIST_PASS_SCORE, notes: '' },
];

// Helper: Menentukan jenis pelanggaran yang paling relevan berdasarkan item checklist yang gagal
const getMatchingViolationType = (
  failedItems: ChecklistFormItem[],
  types: ViolationType[],
  rules?: PenaltyRule[]
): ViolationType | undefined => {
  const matchedTypes: ViolationType[] = [];

  for (const item of failedItems) {
    const lower = item.name.toLowerCase();
    let match: ViolationType | undefined;
    // 1. Sampah / Kolong Meja / Kursi -> vt-1 (Sampah Menumpuk Tidak Dibuang)
    if (lower.includes('sampah') || lower.includes('kolong') || lower.includes('kursi')) {
      match = types.find((t) => t.id === 'vt-1' || t.name.toLowerCase().includes('sampah'));
    }
    // 2. Coretan / Vandalisme -> vt-2 (Coretan Meja / Dinding)
    else if (lower.includes('coretan') || lower.includes('dinding')) {
      match = types.find((t) => t.id === 'vt-2' || t.name.toLowerCase().includes('coretan'));
    }
    // 3. Papan Tulis -> vt-3 (Papan Tulis Belum Dihapus)
    else if (lower.includes('papan') || lower.includes('penghapus')) {
      match = types.find((t) => t.id === 'vt-3' || t.name.toLowerCase().includes('papan'));
    }
    // 4. Lantai -> vt-4 (Lantai Kotor / Noda Minuman)
    else if (lower.includes('lantai')) {
      match = types.find((t) => t.id === 'vt-4' || t.name.toLowerCase().includes('lantai'));
    }

    if (match && !matchedTypes.some((m) => m.id === match.id)) {
      matchedTypes.push(match);
    }
  }

  // Prioritaskan jenis pelanggaran yang memiliki aturan denda aktif
  if (rules && rules.length > 0) {
    const typeWithActiveRule = matchedTypes.find((t) =>
      rules.some((r) => r.isActive && r.violationTypeId === t.id)
    );
    if (typeWithActiveRule) return typeWithActiveRule;
  }

  if (matchedTypes.length > 0) return matchedTypes[0];

  // Fallback ke tipe aktif pertama atau tipe pertama di koleksi
  return types.find((t) => t.isActive) || types[0];
};

export const InspectionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [penaltyRules, setPenaltyRules] = useState<PenaltyRule[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [selectedInspectionItems, setSelectedInspectionItems] = useState<InspectionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Form States for New Inspection
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [overallNotes, setOverallNotes] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistFormItem[]>(DEFAULT_CHECKLIST_TEMPLATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States for Edit Inspection
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [editAreaId, setEditAreaId] = useState('');
  const [editInspectionDate, setEditInspectionDate] = useState('');
  const [editOverallNotes, setEditOverallNotes] = useState('');
  const [editChecklistItems, setEditChecklistItems] = useState<ChecklistFormItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Form States for Delete Inspection
  const [deletingInspection, setDeletingInspection] = useState<Inspection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [insp, ar, vt, pr, cls, viols, pens] = await Promise.all([
        DataService.getInspections(),
        DataService.getAreas(),
        DataService.getViolationTypes(),
        DataService.getPenaltyRules(),
        DataService.getClasses(),
        DataService.getViolations(),
        DataService.getPenalties(),
      ]);
      const activeAreas = ar.filter((a) => a.isActive);
      setInspections(insp);
      setAreas(ar);
      setViolationTypes(vt);
      setPenaltyRules(pr);
      setClasses(cls);
      setViolations(viols);
      setPenalties(pens);
      if (activeAreas.length > 0 && !selectedAreaId) {
        setSelectedAreaId(activeAreas[0].id);
      }
    } catch (err) {
      console.error('Failed to load inspections data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetail = async (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setLoadingItems(true);
    try {
      const items = await DataService.getInspectionItems(inspection.id);
      setSelectedInspectionItems(items);
    } catch (err) {
      console.error('Failed to load items', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleOpenEditModal = async (insp: Inspection, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingInspection(insp);
    setEditAreaId(insp.areaId);
    setEditInspectionDate(insp.date);
    setEditOverallNotes(insp.notes || '');
    setEditModalError(null);
    setIsUpdating(false);

    try {
      const items = await DataService.getInspectionItems(insp.id);
      if (items.length > 0) {
        setEditChecklistItems(
          items.map((it) => ({
            id: it.id,
            name: it.itemName,
            passed: it.passed,
            score: it.score ?? (it.passed ? CHECKLIST_PASS_SCORE : CHECKLIST_FAIL_SCORE),
            notes: it.notes || '',
          }))
        );
      } else {
        setEditChecklistItems(DEFAULT_CHECKLIST_TEMPLATE);
      }
    } catch (err) {
      console.error('Failed to load inspection items for edit', err);
      setEditChecklistItems(DEFAULT_CHECKLIST_TEMPLATE);
    }
  };

  const handleToggleEditChecklistItem = (index: number) => {
    setEditChecklistItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const newPassed = !item.passed;
          return {
            ...item,
            passed: newPassed,
            score: newPassed ? CHECKLIST_PASS_SCORE : CHECKLIST_FAIL_SCORE,
          };
        }
        return item;
      })
    );
  };

  const handleEditItemNoteChange = (index: number, notes: string) => {
    setEditChecklistItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, notes } : item))
    );
  };

  const handleUpdateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInspection || !editAreaId || isUpdating) return;

    setIsUpdating(true);
    setEditModalError(null);
    setFeedbackMessage(null);

    try {
      const area = areas.find((a) => a.id === editAreaId);
      let effectiveClassId = area?.classId;
      if (!effectiveClassId && area && area.category === 'class') {
        const matchedClass = classes.find((c) => {
          const cName = c.name.trim().toLowerCase();
          const aName = area.name.trim().toLowerCase();
          return aName === cName || aName.includes(cName);
        });
        if (matchedClass) {
          effectiveClassId = matchedClass.id;
        }
      }

      const totalScore = calculateInspectionScore(editChecklistItems);
      const hasViolations = editChecklistItems.some((i) => !i.passed);
      const overallGrade = getCleanlinessGrade(totalScore);

      const inspectionUpdates = {
        areaId: editAreaId,
        areaName: area ? area.name : editingInspection.areaName,
        ...(effectiveClassId ? { classId: effectiveClassId } : {}),
        date: editInspectionDate,
        status: 'completed' as const,
        overallGrade,
        totalScore,
        notes: editOverallNotes,
        hasViolations,
      };

      const itemsPayload = editChecklistItems.map((item) => ({
        id: item.id,
        itemName: item.name,
        passed: item.passed,
        score: item.score,
        notes: item.notes,
      }));

      await DataService.updateInspection(
        editingInspection.id,
        inspectionUpdates,
        itemsPayload
      );

      setFeedbackMessage({
        type: 'success',
        text: `Data pemeriksaan ${area?.name || editingInspection.areaName} berhasil diperbarui (Skor: ${totalScore}%).`,
      });
      setEditingInspection(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to update inspection', err);
      const errorMsg = err?.message || 'Gagal menyimpan perubahan pemeriksaan.';
      setEditModalError(errorMsg);
      setFeedbackMessage({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDeleteModal = (insp: Inspection, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingInspection(insp);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingInspection || isDeleting) return;

    setIsDeleting(true);
    setDeleteModalError(null);
    setFeedbackMessage(null);

    try {
      await DataService.deleteInspection(deletingInspection.id);
      setFeedbackMessage({
        type: 'success',
        text: `Pemeriksaan ${deletingInspection.areaName} tanggal ${deletingInspection.date} berhasil dihapus.`,
      });
      setDeletingInspection(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete inspection', err);
      const errorMsg = err?.message || 'Gagal menghapus data pemeriksaan.';
      setDeleteModalError(errorMsg);
      setFeedbackMessage({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleChecklistItem = (index: number) => {
    setChecklistItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const newPassed = !item.passed;
          return {
            ...item,
            passed: newPassed,
            score: newPassed ? CHECKLIST_PASS_SCORE : CHECKLIST_FAIL_SCORE,
          };
        }
        return item;
      })
    );
  };

  const handleItemNoteChange = (index: number, notes: string) => {
    setChecklistItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, notes } : item))
    );
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaId || isSubmitting) return;

    if (!currentUser) {
      const authError = 'Sesi login tidak valid. Silakan login kembali.';
      setModalError(authError);
      setFeedbackMessage({
        type: 'error',
        text: authError,
      });
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    setFeedbackMessage(null);

    try {
      const area = areas.find((a) => a.id === selectedAreaId);

      // Cek dan evaluasi classId secara transparan tanpa membuat classId palsu
      let effectiveClassId = area?.classId;
      if (!effectiveClassId && area && area.category === 'class') {
        // Jika area adalah ruang kelas namun classId belum diset, cari hubungan legitimate via master classes
        const matchedClass = classes.find((c) => {
          const cName = c.name.trim().toLowerCase();
          const aName = area.name.trim().toLowerCase();
          return aName === cName || aName.includes(cName);
        });
        if (matchedClass) {
          effectiveClassId = matchedClass.id;
          console.log(
            `[DEBUG InspectionsPage] Resolved classId '${matchedClass.id}' (${matchedClass.name}) from classes collection matching area '${area.name}'`
          );
        }
      }

      const totalScore = calculateInspectionScore(checklistItems);
      const hasViolations = checklistItems.some((i) => !i.passed);
      const overallGrade = getCleanlinessGrade(totalScore);

      const inspectionPayload = {
        areaId: selectedAreaId,
        areaName: area ? area.name : 'Area',
        ...(effectiveClassId ? { classId: effectiveClassId } : {}),
        inspectorId: currentUser.uid,
        inspectorName: currentUser.displayName || 'Petugas Kebersihan',
        date: inspectionDate,
        status: 'completed' as const,
        overallGrade,
        totalScore,
        notes: overallNotes,
        hasViolations,
        completedAt: new Date().toISOString(),
      };

      const inspectionItemsPayload = checklistItems.map((item) => ({
        itemName: item.name,
        passed: item.passed,
        score: item.score,
        notes: item.notes,
      }));

      // ============================================================
      // DEBUG WAJIB: Log nilai sebelum DataService.createInspection()
      // ============================================================
      console.log('=== [SIBERSIH DEBUG PRE-INSPECTION CREATE] ===');
      console.log('1. selectedAreaId:', selectedAreaId);
      console.log('2. area object:', area);
      console.log('3. area.classId (raw):', area?.classId, '| effectiveClassId:', effectiveClassId);
      console.log('4. currentUser.uid:', currentUser.uid);
      console.log('5. currentUser.role:', currentUser.role);
      console.log('6. inspection payload:', inspectionPayload);
      console.log('7. inspection items payload:', inspectionItemsPayload);
      console.log('=============================================');

      const newInspection = await DataService.createInspection(
        inspectionPayload,
        inspectionItemsPayload
      );

      // Jika ada item checklist yang tidak lolos, catat pelanggaran dan cari aturan denda yang berlaku
      if (hasViolations && area) {
        const failedItems = checklistItems.filter((i) => !i.passed);

        // Tentukan violation type berdasarkan item yang gagal dengan mempertimbangkan penaltyRules aktif
        const matchedType = getMatchingViolationType(failedItems, violationTypes, penaltyRules);
        const violationTypeId = matchedType?.id || 'vt-1';
        const violationTypeName = matchedType?.name || 'Ketidaksesuaian Standar Kebersihan';
        const severity: ViolationSeverity = totalScore < 60 ? 'high' : 'medium';

        // Cari aturan denda aktif yang cocok dengan jenis pelanggaran
        const matchingRule = penaltyRules.find(
          (r) => r.isActive && r.violationTypeId === violationTypeId
        );

        let penaltyPayload = undefined;
        let penaltyCreated = false;

        if (matchingRule) {
          penaltyCreated = true;
          penaltyPayload = {
            ...(effectiveClassId ? { classId: effectiveClassId } : {}),
            className: area.name,
            responsiblePerson: effectiveClassId ? `Ketua Piket ${area.name}` : `Penanggung Jawab ${area.name}`,
            amount: matchingRule.fineAmount,
            reason: `${violationTypeName}: ${failedItems.map((f) => f.name).join(', ')}`,
            status: 'pending' as const,
            issuedById: currentUser.uid,
            issuedByName: currentUser.displayName || 'Petugas Kebersihan',
            issuedDate: inspectionDate,
            notes: `Diterbitkan otomatis dari hasil inspeksi (${overallGrade.toUpperCase()}). Aturan denda: ${matchingRule.description || matchingRule.violationTypeName}.`,
          };
        }

        console.log('[DEBUG InspectionsPage] Pre-createViolationWithPenalty:', {
          violationTypeId,
          violationTypeName,
          matchingRuleFound: !!matchingRule,
          penaltyPayload,
        });

        await DataService.createViolationWithPenalty(
          {
            inspectionId: newInspection.id,
            areaId: area.id,
            areaName: area.name,
            ...(effectiveClassId ? { classId: effectiveClassId } : {}),
            className: area.name,
            violationTypeId,
            violationTypeName,
            severity,
            description: `Item gagal: ${failedItems.map((f) => f.name).join(', ')}. Catatan: ${overallNotes || '-'}`,
            reportedById: currentUser.uid,
            reportedByName: currentUser.displayName || 'Petugas Kebersihan',
            date: inspectionDate,
            photoUrls: [],
            penaltyCreated,
          },
          penaltyPayload
        );

        if (matchingRule) {
          setFeedbackMessage({
            type: 'success',
            text: `Pemeriksaan ${area.name} selesai (${overallGrade.toUpperCase()}). Pelanggaran "${violationTypeName}" tercatat dan sanksi denda sebesar Rp ${matchingRule.fineAmount.toLocaleString('id-ID')} otomatis diterbitkan.`,
          });
        } else {
          setFeedbackMessage({
            type: 'warning',
            text: `Pemeriksaan ${area.name} selesai. Pelanggaran "${violationTypeName}" tercatat, namun tidak ada aturan denda yang berlaku untuk jenis pelanggaran ini.`,
          });
        }
      } else if (area) {
        setFeedbackMessage({
          type: 'success',
          text: `Pemeriksaan ${area.name} selesai. Seluruh item checklist bersih dan memenuhi standar kebersihan.`,
        });
      }

      setIsCreateModalOpen(false);
      setModalError(null);
      // Reset form
      setChecklistItems(DEFAULT_CHECKLIST_TEMPLATE);
      setOverallNotes('');
      await loadData();
    } catch (err: any) {
      console.error('Failed to create inspection', err);
      const errorMsg = err?.message || 'Gagal menyimpan hasil pemeriksaan.';
      setModalError(errorMsg);
      setFeedbackMessage({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Memuat daftar pemeriksaan..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header with New Inspection Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Catatan Pemeriksaan</h2>
          <p className="text-xs text-slate-500">Hasil checklist kebersihan lingkungan</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setModalError(null);
            setIsCreateModalOpen(true);
          }}
        >
          Periksa Baru
        </Button>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between animate-in fade-in duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : feedbackMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : feedbackMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline ml-2 opacity-70 hover:opacity-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Inspections List */}
      {inspections.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="w-8 h-8" />}
          title="Belum Ada Pemeriksaan"
          description="Lakukan inspeksi kebersihan ruang kelas atau fasilitas pondok untuk mencatat checklist."
          actionLabel="Mulai Pemeriksaan Sekarang"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {inspections.map((insp) => (
            <Card
              key={insp.id}
              hoverEffect
              onClick={() => handleOpenDetail(insp)}
              className="p-3.5 bg-white flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{insp.areaName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {insp.date}
                    </span>
                    <span>•</span>
                    <span className="truncate">{insp.inspectorName}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <Badge
                    variant={
                      insp.overallGrade === 'clean'
                        ? 'success'
                        : insp.overallGrade === 'moderate'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {insp.overallGrade === 'clean'
                      ? 'Bersih'
                      : insp.overallGrade === 'moderate'
                      ? 'Cukup'
                      : 'Kotor'}
                  </Badge>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {insp.totalScore ?? 0}%
                  </div>
                </div>
              </div>

              {insp.notes && (
                <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                  {insp.notes}
                </p>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                {insp.hasViolations ? (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                    <AlertTriangle className="w-3 h-3" /> Ada temuan pelanggaran
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">Pemeriksaan selesai</div>
                )}

                {currentUser?.role === 'cleaner' && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditModal(insp, e)}
                      className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit Pemeriksaan"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleOpenDeleteModal(insp, e)}
                      className="px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Hapus Pemeriksaan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Buat Pemeriksaan Baru */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Form Checklist Pemeriksaan"
        description="Pilih lokasi dan centang kondisi kebersihan setiap kriteria"
        size="lg"
      >
        <form onSubmit={handleCreateInspection} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Pilih Area / Lokasi"
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              options={areas
                .filter((a) => a.isActive)
                .map((a) => ({ value: a.id, label: `${a.name} (${a.building})` }))}
              required
            />
            <Input
              type="date"
              label="Tanggal Pemeriksaan"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              required
            />
          </div>

          {/* Checklist Items */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Daftar Checklist Penilaian
            </label>
            <div className="space-y-2">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    item.passed
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleChecklistItem(idx)}
                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        item.passed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {item.passed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lolos
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Tidak Lolos
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Catatan tambahan kriteria ini (opsional)..."
                    value={item.notes}
                    onChange={(e) => handleItemNoteChange(idx, e.target.value)}
                    className="w-full mt-2 text-xs p-1.5 bg-white/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <Textarea
            label="Catatan Keseluruhan Inspeksi"
            placeholder="Tuliskan ringkasan evaluasi atau pesan untuk penanggung jawab kelas..."
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
          />

          {modalError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Penyimpanan Gagal</p>
                <p className="text-[11px] mt-0.5">{modalError}</p>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Simpan Hasil Pemeriksaan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Pemeriksaan */}
      <Modal
        isOpen={Boolean(editingInspection)}
        onClose={() => setEditingInspection(null)}
        title="Edit Pemeriksaan Kebersihan"
        description={`Koreksi hasil checklist untuk ${editingInspection?.areaName || 'Lokasi'}`}
        size="lg"
      >
        {editingInspection && (
          <form onSubmit={handleUpdateInspection} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Pilih Area / Lokasi"
                value={editAreaId}
                onChange={(e) => setEditAreaId(e.target.value)}
                options={areas
                  .filter((a) => a.isActive)
                  .map((a) => ({ value: a.id, label: `${a.name} (${a.building})` }))}
                required
              />
              <Input
                type="date"
                label="Tanggal Pemeriksaan"
                value={editInspectionDate}
                onChange={(e) => setEditInspectionDate(e.target.value)}
                required
              />
            </div>

            {/* Live Score Preview in Edit Modal */}
            {(() => {
              const liveScore =
                editChecklistItems.length > 0
                  ? calculateInspectionScore(editChecklistItems)
                  : editingInspection.totalScore ?? 0;
              const liveGrade = getCleanlinessGrade(liveScore);

              return (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Perhitungan Skor Baru</span>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">
                      {liveScore}%
                    </div>
                  </div>
                  <Badge
                    variant={
                      liveGrade === 'clean'
                        ? 'success'
                        : liveGrade === 'moderate'
                        ? 'warning'
                        : 'danger'
                    }
                    size="md"
                  >
                    {liveGrade === 'clean'
                      ? 'Bersih'
                      : liveGrade === 'moderate'
                      ? 'Cukup'
                      : 'Kotor'}
                  </Badge>
                </div>
              );
            })()}

            {/* Edit Checklist Items */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Koreksi Checklist Penilaian
              </label>
              <div className="space-y-2">
                {editChecklistItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      item.passed
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEditChecklistItem(idx)}
                        className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          item.passed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {item.passed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lolos
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Tidak Lolos
                          </>
                        )}
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Catatan tambahan kriteria ini (opsional)..."
                      value={item.notes}
                      onChange={(e) => handleEditItemNoteChange(idx, e.target.value)}
                      className="w-full mt-2 text-xs p-1.5 bg-white/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Textarea
              label="Catatan Keseluruhan Inspeksi"
              placeholder="Tuliskan catatan perbaikan..."
              value={editOverallNotes}
              onChange={(e) => setEditOverallNotes(e.target.value)}
            />

            {editModalError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Update Gagal</p>
                  <p className="text-[11px] mt-0.5">{editModalError}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingInspection(null)}
                disabled={isUpdating}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={isUpdating} disabled={isUpdating}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Konfirmasi Hapus Pemeriksaan */}
      <Modal
        isOpen={Boolean(deletingInspection)}
        onClose={() => setDeletingInspection(null)}
        title="Konfirmasi Hapus Pemeriksaan"
        description="Pemeriksaan yang dihapus tidak dapat dikembalikan lagi."
        size="md"
      >
        {deletingInspection && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Area / Lokasi:</span>
                <span className="font-bold text-slate-800">{deletingInspection.areaName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Tanggal:</span>
                <span className="font-medium text-slate-700">{deletingInspection.date}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Petugas:</span>
                <span className="font-medium text-slate-700">{deletingInspection.inspectorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hasil Evaluasi:</span>
                <span className="font-bold text-slate-900">
                  {deletingInspection.totalScore ?? 0}% ({deletingInspection.overallGrade?.toUpperCase()})
                </span>
              </div>
            </div>

            {/* Check for Linked Violations / Penalties */}
            {violations.some((v) => v.inspectionId === deletingInspection.id || penalties.some((p) => p.violationId === v.id && v.inspectionId === deletingInspection.id)) && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Catatan Relasi Pelanggaran & Kas Denda</span>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  Pemeriksaan ini memiliki catatan temuan pelanggaran / sanksi denda yang pernah diterbitkan.
                  Menghapus pemeriksaan ini <strong>tidak akan menghapus catatan pelanggaran atau bukti kuitansi denda</strong> demi menjaga integritas data audit dan pembukuan kas.
                </p>
              </div>
            )}

            {deleteModalError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Gagal Menghapus</p>
                  <p className="text-[11px] mt-0.5">{deleteModalError}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingInspection(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isDeleting}
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                Hapus Pemeriksaan
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Detail Pemeriksaan */}
      <Modal
        isOpen={Boolean(selectedInspection)}
        onClose={() => setSelectedInspection(null)}
        title={selectedInspection?.areaName || 'Detail Pemeriksaan'}
        description={`Tanggal: ${selectedInspection?.date} • Pengawas: ${selectedInspection?.inspectorName}`}
      >
        {loadingItems ? (
          <LoadingState message="Memuat rincian checklist..." />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 font-medium">Skor Kebersihan</span>
                <div className="text-xl font-bold text-slate-900">
                  {selectedInspection?.totalScore ?? 0}%
                </div>
              </div>
              <Badge
                variant={
                  selectedInspection?.overallGrade === 'clean'
                    ? 'success'
                    : selectedInspection?.overallGrade === 'moderate'
                    ? 'warning'
                    : 'danger'
                }
                size="md"
              >
                {selectedInspection?.overallGrade === 'clean'
                  ? 'Bersih'
                  : selectedInspection?.overallGrade === 'moderate'
                  ? 'Cukup'
                  : 'Kotor'}
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rincian Checklist
              </h4>
              {selectedInspectionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{item.itemName}</p>
                    {item.notes && <p className="text-[11px] text-slate-500 italic">{item.notes}</p>}
                  </div>
                  {item.passed ? (
                    <Badge variant="success" size="sm">
                      Lolos
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="sm">
                      Gagal
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {selectedInspection?.notes && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Catatan Pengawas:</span>
                <p className="text-xs text-slate-600 mt-1">{selectedInspection.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
