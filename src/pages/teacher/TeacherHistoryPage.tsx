import React, { useState, useEffect } from 'react';
import { History, Calendar, MapPin } from 'lucide-react';
import { Card, Badge, Modal, LoadingState, EmptyState } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { DataService } from '../../services/dataService';
import {
  getCleanlinessBadgeVariant,
  getCleanlinessPredicate,
  getCleanlinessLabel,
} from '../../utils/inspectionUtils';
import type { Inspection, InspectionItem } from '../../types';

export const TeacherHistoryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [selectedItems, setSelectedItems] = useState<InspectionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [hasAssignment, setHasAssignment] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // FIX 1: Query inspections strictly for this teacher's assigned classroom
        const assign = await DataService.getTeacherAssignments(currentUser?.uid);
        if (assign.length === 0) {
          setHasAssignment(false);
          setIsLoading(false);
          return;
        }

        setHasAssignment(true);
        // TODO: Multi-class selector if teacher has multiple assignments
        const assignedClassId = assign[0].classId;
        const classInspections = await DataService.getInspections(assignedClassId);
        setInspections(classInspections);
      } catch (err) {
        console.error('Failed to load inspection history', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [currentUser]);

  const handleOpenDetail = async (insp: Inspection) => {
    setSelectedInspection(insp);
    setLoadingItems(true);
    try {
      const items = await DataService.getInspectionItems(insp.id);
      setSelectedItems(items);
    } catch (err) {
      console.error('Failed to load items', err);
    } finally {
      setLoadingItems(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Memuat riwayat pemeriksaan kelas..." />;
  }

  // FIX 1: If no assignment, render informative EmptyState without attempting to read class-1
  if (!hasAssignment) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Riwayat Nilai Kebersihan</h2>
          <p className="text-xs text-slate-500">Histori evaluasi checklist ruang kelas santri</p>
        </div>
        <EmptyState
          title="Belum Ada Penugasan Kelas"
          description="Anda belum ditugaskan sebagai wali kelas. Silakan hubungi bagian administrasi pesantren."
        />
      </div>
    );
  }


  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">Riwayat Nilai Kebersihan</h2>
        <p className="text-xs text-slate-500">Histori evaluasi checklist ruang kelas santri</p>
      </div>

      {inspections.length === 0 ? (
        <EmptyState
          icon={<History className="w-8 h-8" />}
          title="Belum Ada Riwayat"
          description="Belum ada data riwayat inspeksi kebersihan untuk ruang kelas Anda."
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
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{insp.areaName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> {insp.date}
                    </span>
                    <span>•</span>
                    <span>{insp.inspectorName}</span>
                  </div>
                </div>

                <div className="text-right">
                  <Badge
                    variant={getCleanlinessBadgeVariant(insp.totalScore ?? 0)}
                    size="sm"
                  >
                    {getCleanlinessPredicate(insp.totalScore ?? 0)}
                  </Badge>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    Skor: {insp.totalScore ?? 0}%
                  </div>
                </div>
              </div>

              {insp.notes && (
                <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                  "{insp.notes}"
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Read-Only Detail */}
      <Modal
        isOpen={Boolean(selectedInspection)}
        onClose={() => setSelectedInspection(null)}
        title={selectedInspection?.areaName || 'Detail Evaluasi'}
        description={`Tanggal: ${selectedInspection?.date} • Pengawas: ${selectedInspection?.inspectorName}`}
      >
        {loadingItems ? (
          <LoadingState message="Memuat checklist..." />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 font-medium">Nilai Total:</span>
                <div className="text-xl font-bold text-slate-900">
                  {selectedInspection?.totalScore ?? 0}%
                </div>
              </div>
              <Badge
                variant={getCleanlinessBadgeVariant(selectedInspection?.totalScore ?? 0)}
                size="md"
              >
                {getCleanlinessLabel(selectedInspection?.totalScore ?? 0)}
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Poin Penilaian Kebersihan:
              </h4>
              {selectedItems.map((item) => (
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
                      Tidak Lolos
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {selectedInspection?.notes && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Pesan Pengawas:</span>
                <p className="text-xs text-slate-600 mt-1">{selectedInspection.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
