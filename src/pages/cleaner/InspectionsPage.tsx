import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  AlertTriangle,
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
import type { Area, Inspection, InspectionItem } from '../../types';

interface ChecklistFormItem {
  name: string;
  passed: boolean;
  score: number;
  notes: string;
}

const DEFAULT_CHECKLIST_TEMPLATE: ChecklistFormItem[] = [
  { name: 'Kebersihan Lantai & Sudut Ruang', passed: true, score: 90, notes: '' },
  { name: 'Kerapian Meja & Kolong Kursi', passed: true, score: 90, notes: '' },
  { name: 'Papan Tulis & Penghapus Bersih', passed: true, score: 90, notes: '' },
  { name: 'Tempat Sampah Kosong & Berplastik', passed: true, score: 90, notes: '' },
  { name: 'Jendela, Pintu & Ventilasi Udara', passed: true, score: 90, notes: '' },
];

export const InspectionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
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

  const loadData = async () => {
    try {
      const [insp, ar] = await Promise.all([
        DataService.getInspections(),
        DataService.getAreas(),
      ]);
      const activeAreas = ar.filter((a) => a.isActive);
      setInspections(insp);
      setAreas(ar);
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

  const handleToggleChecklistItem = (index: number) => {
    setChecklistItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const newPassed = !item.passed;
          return {
            ...item,
            passed: newPassed,
            score: newPassed ? 90 : 40,
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
    if (!selectedAreaId) return;

    setIsSubmitting(true);
    try {
      const area = areas.find((a) => a.id === selectedAreaId);
      const totalScore = Math.round(
        checklistItems.reduce((acc, curr) => acc + curr.score, 0) / checklistItems.length
      );

      const hasViolations = checklistItems.some((i) => !i.passed);

      let overallGrade: Inspection['overallGrade'] = 'clean';
      if (totalScore < 60) overallGrade = 'critical';
      else if (totalScore < 75) overallGrade = 'dirty';
      else if (totalScore < 85) overallGrade = 'moderate';

      const newInspection = await DataService.createInspection(
        {
          areaId: selectedAreaId,
          areaName: area ? area.name : 'Area',
          classId: area?.classId,
          inspectorId: currentUser?.uid || 'cleaner-1',
          inspectorName: currentUser?.displayName || 'Petugas Kebersihan',
          date: inspectionDate,
          status: 'completed',
          overallGrade,
          totalScore,
          notes: overallNotes,
          hasViolations,
          completedAt: new Date().toISOString(),
        },
        checklistItems.map((item) => ({
          itemName: item.name,
          passed: item.passed,
          score: item.score,
          notes: item.notes,
        }))
      );

      // If violations found, create a violation record automatically
      // FIX 4: Bind inspectionId so automatic violation links to its parent inspection
      if (hasViolations && area) {
        const failedItems = checklistItems.filter((i) => !i.passed);
        await DataService.createViolationWithPenalty({
          inspectionId: newInspection.id,
          areaId: area.id,
          areaName: area.name,
          classId: area.classId,
          className: area.name,
          violationTypeId: 'vt-1',
          violationTypeName: 'Ketidaksesuaian Standar Kebersihan',
          severity: totalScore < 60 ? 'high' : 'medium',
          description: `Item gagal: ${failedItems.map((f) => f.name).join(', ')}. Catatan: ${overallNotes || '-'}`,
          reportedById: currentUser?.uid || 'cleaner-1',
          reportedByName: currentUser?.displayName || 'Petugas Kebersihan',
          date: inspectionDate,
          photoUrls: [],
          penaltyCreated: false,
        });
      }


      setIsCreateModalOpen(false);
      // Reset form
      setChecklistItems(DEFAULT_CHECKLIST_TEMPLATE);
      setOverallNotes('');
      await loadData();
    } catch (err) {
      console.error('Failed to create inspection', err);
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
          onClick={() => setIsCreateModalOpen(true)}
        >
          Periksa Baru
        </Button>
      </div>

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

              {insp.hasViolations && (
                <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 w-fit">
                  <AlertTriangle className="w-3 h-3" /> Ada temuan pelanggaran
                </div>
              )}
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
                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
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

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Simpan Hasil Pemeriksaan
            </Button>
          </div>
        </form>
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
