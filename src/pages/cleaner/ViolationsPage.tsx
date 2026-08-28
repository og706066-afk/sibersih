import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Calendar,
  MapPin,
  Camera,
  Receipt,
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
import type { Area, Violation, ViolationType, PenaltyRule } from '../../types';

export const ViolationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [penaltyRules, setPenaltyRules] = useState<PenaltyRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

  // Form State
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [createPenalty, setCreatePenalty] = useState(true);
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [viols, ar, vt, pr] = await Promise.all([
        DataService.getViolations(),
        DataService.getAreas(),
        DataService.getViolationTypes(),
        DataService.getPenaltyRules(),
      ]);
      setViolations(viols);
      setAreas(ar);
      setViolationTypes(vt);
      setPenaltyRules(pr);

      if (ar.length > 0 && !selectedAreaId) setSelectedAreaId(ar[0].id);
      if (vt.length > 0 && !selectedTypeId) setSelectedTypeId(vt[0].id);
    } catch (err) {
      console.error('Failed to load violations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId);
    const vt = violationTypes.find((t) => t.id === typeId);
    if (vt) {
      setSeverity(vt.severity);
    }
  };

  const handleCreateViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaId || !selectedTypeId) return;

    setIsSubmitting(true);
    try {
      const area = areas.find((a) => a.id === selectedAreaId);
      const vtype = violationTypes.find((t) => t.id === selectedTypeId);

      const newViolation = await DataService.addViolation({
        areaId: selectedAreaId,
        areaName: area ? area.name : 'Area',
        classId: area?.classId,
        className: area?.name,
        violationTypeId: selectedTypeId,
        violationTypeName: vtype ? vtype.name : 'Pelanggaran',
        severity,
        description,
        reportedById: currentUser?.uid || 'cleaner-1',
        reportedByName: currentUser?.displayName || 'Petugas Kebersihan',
        date: new Date().toISOString().split('T')[0],
        photoUrls: photoUrl ? [photoUrl] : [],
        penaltyCreated: createPenalty,
      });

      // If user enabled penalty creation, automatically generate a penalty record
      if (createPenalty) {
        const matchingRule = penaltyRules.find((r) => r.violationTypeId === selectedTypeId);
        const amount = matchingRule ? matchingRule.fineAmount : vtype?.defaultPenaltyAmount || 25000;

        await DataService.addPenalty({
          violationId: newViolation.id,
          classId: area?.classId,
          className: area?.name,
          responsiblePerson: responsiblePerson || `Piket ${area?.name || 'Kelas'}`,
          amount,
          reason: `${vtype?.name || 'Pelanggaran Kebersihan'}: ${description}`,
          status: 'pending',
          issuedById: currentUser?.uid || 'cleaner-1',
          issuedByName: currentUser?.displayName || 'Petugas Kebersihan',
          issuedDate: new Date().toISOString().split('T')[0],
          notes: 'Wajib diselesaikan dalam waktu 2x24 jam.',
        });
      }

      setIsCreateModalOpen(false);
      setDescription('');
      setPhotoUrl('');
      setResponsiblePerson('');
      await loadData();
    } catch (err) {
      console.error('Failed to create violation', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Memuat daftar pelanggaran..." />;
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <Badge variant="danger" size="sm">Kritis</Badge>;
      case 'high':
        return <Badge variant="danger" size="sm">Tinggi</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">Sedang</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Ringan</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Pelanggaran Kebersihan</h2>
          <p className="text-xs text-slate-500">Temuan masalah & sanksi kebersihan</p>
        </div>
        <Button
          size="sm"
          variant="danger"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Catat Masalah
        </Button>
      </div>

      {/* Violations List */}
      {violations.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title="Tidak Ada Pelanggaran"
          description="Alhamdulillah, saat ini tidak ada catatan pelanggaran kebersihan yang tercatat."
          actionLabel="Catat Temuan Baru"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {violations.map((viol) => (
            <Card
              key={viol.id}
              hoverEffect
              onClick={() => setSelectedViolation(viol)}
              className="p-3.5 bg-white flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{viol.areaName}</span>
                  </div>
                  <p className="text-xs font-semibold text-rose-700 mt-1">
                    {viol.violationTypeName}
                  </p>
                </div>
                <div className="shrink-0 ml-2">{getSeverityBadge(viol.severity)}</div>
              </div>

              <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                {viol.description}
              </p>

              {/* Photo preview if present */}
              {viol.photoUrls && viol.photoUrls.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                  <span>1 Foto Bukti Terlampir</span>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {viol.date}
                </span>
                {viol.penaltyCreated ? (
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <Receipt className="w-3 h-3" /> Denda Diterbitkan
                  </span>
                ) : (
                  <span className="text-slate-400">Peringatan Lisan</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Catat Pelanggaran Baru */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Catat Pelanggaran Kebersihan"
        description="Dokumentasikan bukti dan terbitkan sanksi kebersihan"
        size="lg"
      >
        <form onSubmit={handleCreateViolation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Lokasi / Area"
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              options={areas.map((a) => ({ value: a.id, label: a.name }))}
              required
            />
            <Select
              label="Jenis Pelanggaran"
              value={selectedTypeId}
              onChange={(e) => handleTypeChange(e.target.value)}
              options={violationTypes.map((vt) => ({ value: vt.id, label: vt.name }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tingkat Keparahan"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              options={[
                { value: 'low', label: 'Ringan (Peringatan)' },
                { value: 'medium', label: 'Sedang (Standar Denda)' },
                { value: 'high', label: 'Tinggi (Denda + Pembersihan)' },
                { value: 'critical', label: 'Kritis (Panggil Wali Santri/Wali Kelas)' },
              ]}
              required
            />
            <Input
              label="Foto Bukti (URL / Kamera)"
              placeholder="https://... atau ambil gambar"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              rightIcon={
                <button
                  type="button"
                  onClick={() =>
                    setPhotoUrl(
                      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80'
                    )
                  }
                  className="text-xs text-emerald-600 hover:underline cursor-pointer"
                >
                  Contoh Foto
                </button>
              }
            />
          </div>

          <Textarea
            label="Keterangan & Kronologi Temuan"
            placeholder="Tuliskan posisi sampah, coretan, atau kondisi yang tidak sesuai SOP kebersihan..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Denda Checkbox */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createPenalty}
                onChange={(e) => setCreatePenalty(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-amber-900">
                Terbitkan Tagihan Denda Otomatis ke Kas Kebersihan
              </span>
            </label>

            {createPenalty && (
              <Input
                label="Penanggung Jawab / Penerima Sanksi"
                placeholder="Contoh: Ketua Piket Kelas X IPA 1 / Santri Pelaku"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                required={createPenalty}
              />
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="danger" isLoading={isSubmitting}>
              Simpan Pelanggaran
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detail Pelanggaran */}
      <Modal
        isOpen={Boolean(selectedViolation)}
        onClose={() => setSelectedViolation(null)}
        title={selectedViolation?.violationTypeName || 'Detail Pelanggaran'}
        description={`Lokasi: ${selectedViolation?.areaName} • Tanggal: ${selectedViolation?.date}`}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 font-medium">Pelapor:</span>
              <p className="text-xs font-bold text-slate-800">{selectedViolation?.reportedByName}</p>
            </div>
            {selectedViolation && getSeverityBadge(selectedViolation.severity)}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Keterangan:</span>
            <p className="text-xs text-slate-600 mt-1">{selectedViolation?.description}</p>
          </div>

          {selectedViolation?.photoUrls && selectedViolation.photoUrls.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Foto Bukti:</span>
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 bg-black flex items-center justify-center">
                <img
                  src={selectedViolation.photoUrls[0]}
                  alt="Bukti Pelanggaran"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          )}

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">Status Tindak Lanjut:</span>
            {selectedViolation?.penaltyCreated ? (
              <Badge variant="warning" size="sm">Denda Aktif</Badge>
            ) : (
              <Badge variant="neutral" size="sm">Peringatan</Badge>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
