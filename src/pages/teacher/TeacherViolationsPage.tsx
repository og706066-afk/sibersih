import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Ban } from 'lucide-react';

import { Card, Badge, Modal, LoadingState, EmptyState } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { DataService } from '../../services/dataService';
import type { Violation, Penalty } from '../../types';

export const TeacherViolationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

  const [hasAssignment, setHasAssignment] = useState(true);

  useEffect(() => {
    const loadViolations = async () => {
      try {
        // FIX 1: Query violations and penalties strictly for this teacher's assigned classroom
        const assign = await DataService.getTeacherAssignments(currentUser?.uid);
        if (assign.length === 0) {
          setHasAssignment(false);
          setIsLoading(false);
          return;
        }

        setHasAssignment(true);
        // TODO: Multi-class selector if teacher has multiple assignments
        const assignedClassId = assign[0].classId;

        const [viols, pens] = await Promise.all([
          DataService.getViolations(assignedClassId),
          DataService.getPenalties(assignedClassId),
        ]);
        setViolations(viols);
        setPenalties(pens);
      } catch (err) {
        console.error('Failed to load violations', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadViolations();
  }, [currentUser]);

  if (isLoading) {
    return <LoadingState message="Memuat catatan pelanggaran kelas..." />;
  }

  // FIX 1: If no assignment, render informative EmptyState without attempting to read class-1
  if (!hasAssignment) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Catatan Pelanggaran & Denda</h2>
          <p className="text-xs text-slate-500">
            Monitoring ketidaksesuaian piket dan sanksi kas kebersihan santri
          </p>
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
        <h2 className="text-base font-bold text-slate-900">Catatan Pelanggaran & Denda</h2>
        <p className="text-xs text-slate-500">
          Monitoring ketidaksesuaian piket dan sanksi kas kebersihan santri
        </p>
      </div>

      {violations.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8 text-emerald-600" />}
          title="Tidak Ada Pelanggaran Kelas"
          description="Alhamdulillah, santri kelas Anda menjaga kebersihan dengan sangat baik."
        />
      ) : (
        <div className="space-y-2.5">
          {violations.map((viol) => {
            const relatedPenalty = penalties.find((p) => p.violationId === viol.id);
            return (
              <Card
                key={viol.id}
                hoverEffect
                onClick={() => setSelectedViolation(viol)}
                className="p-3.5 bg-white flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-rose-700">{viol.violationTypeName}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{viol.areaName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(viol.status === 'cancelled' || relatedPenalty?.status === 'cancelled') && (
                      <Badge variant="neutral" size="sm">
                        Dibatalkan
                      </Badge>
                    )}
                    <Badge variant={viol.severity === 'high' ? 'danger' : 'warning'} size="sm">
                      {viol.severity === 'high' ? 'Tinggi' : 'Sedang'}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                  {viol.description}
                </p>

                {(viol.status === 'cancelled' || relatedPenalty?.status === 'cancelled') && (
                  <div className="text-xs bg-rose-50/70 p-2 rounded-lg border border-rose-200/80 mt-2 space-y-0.5">
                    <div className="flex items-center gap-1 font-semibold text-rose-800 text-[11px]">
                      <Ban className="w-3 h-3 text-rose-600" />
                      <span>Sanksi Dibatalkan</span>
                    </div>
                    <p className="text-[11px] text-rose-700">
                      Alasan: {viol.cancellationReason || relatedPenalty?.cancellationReason || 'Tanpa keterangan'}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3 h-3" /> {viol.date}
                  </span>

                  {relatedPenalty ? (
                    <div className="flex items-center gap-1 font-semibold">
                      <span
                        className={
                          relatedPenalty.status === 'cancelled'
                            ? 'text-slate-400 line-through'
                            : 'text-slate-700'
                        }
                      >
                        Rp {relatedPenalty.amount.toLocaleString('id-ID')}
                      </span>
                      <Badge
                        variant={
                          relatedPenalty.status === 'paid'
                            ? 'success'
                            : relatedPenalty.status === 'cancelled'
                            ? 'neutral'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {relatedPenalty.status === 'paid'
                          ? 'Lunas'
                          : relatedPenalty.status === 'cancelled'
                          ? 'Dibatalkan'
                          : 'Belum Lunas'}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-slate-400">Peringatan</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: View Violation Proof & Details (Read-Only) */}
      <Modal
        isOpen={Boolean(selectedViolation)}
        onClose={() => setSelectedViolation(null)}
        title={selectedViolation?.violationTypeName || 'Rincian Pelanggaran'}
        description={`Lokasi: ${selectedViolation?.areaName} • Tanggal: ${selectedViolation?.date}`}
      >
        <div className="space-y-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Keterangan Tim Kebersihan:</span>
            <p className="text-xs text-slate-600 mt-1">{selectedViolation?.description}</p>
          </div>

          {selectedViolation?.photoUrls && selectedViolation.photoUrls.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Foto Bukti Pelanggaran:</span>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-black">
                <img
                  src={selectedViolation.photoUrls[0]}
                  alt="Bukti"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          )}

          {selectedViolation?.status === 'cancelled' ? (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-900 flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5 text-rose-600" /> Status Pelanggaran:
                </span>
                <Badge variant="neutral" size="sm">
                  Dibatalkan
                </Badge>
              </div>
              <p className="text-rose-700">
                <strong>Alasan Pembatalan:</strong> {selectedViolation.cancellationReason || 'Tanpa keterangan'}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-900">Pemberitahuan:</span>
              <span className="text-amber-800">
                Mohon ingatkan piket santri terkait sanksi di atas.
              </span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
