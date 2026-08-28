import React, { useState, useEffect } from 'react';
import { Plus, Scale } from 'lucide-react';

import { Card, Button, Badge, Modal, Input, Select, LoadingState } from '../../components/common';
import { DataService } from '../../services/dataService';
import type { ViolationType, PenaltyRule, ViolationSeverity } from '../../types';

export const AdminViolationsRulesPage: React.FC = () => {
  const [types, setTypes] = useState<ViolationType[]>([]);
  const [rules, setRules] = useState<PenaltyRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ViolationSeverity>('medium');
  const [defaultPenalty, setDefaultPenalty] = useState(25000);

  const loadData = async () => {
    try {
      const [vt, pr] = await Promise.all([
        DataService.getViolationTypes(),
        DataService.getPenaltyRules(),
      ]);
      setTypes(vt);
      setRules(pr);
    } catch (err) {
      console.error('Failed to load rules', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    const newType: ViolationType = {
      id: `vt-${Date.now()}`,
      name,
      description,
      severity,
      defaultPenaltyAmount: defaultPenalty,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setTypes([...types, newType]);
    setIsModalOpen(false);
    setName('');
    setDescription('');
  };

  if (isLoading) {
    return <LoadingState message="Memuat aturan denda & pelanggaran..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Jenis Pelanggaran & Denda</h2>
          <p className="text-xs text-slate-500">Konfigurasi standar sanksi kebersihan pesantren</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Tambah Jenis
        </Button>
      </div>

      <div className="space-y-2.5">
        {types.map((t) => (
          <Card key={t.id} className="p-3.5 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-bold text-sm text-slate-900">{t.name}</span>
                <p className="text-xs text-slate-500 mt-1">{t.description}</p>
              </div>
              <Badge
                variant={t.severity === 'high' ? 'danger' : t.severity === 'medium' ? 'warning' : 'neutral'}
                size="sm"
              >
                {t.severity === 'high' ? 'Tinggi' : t.severity === 'medium' ? 'Sedang' : 'Ringan'}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Scale className="w-3 h-3 text-slate-400" />
                {rules.some((r) => r.violationTypeId === t.id) ? 'Aturan Aktif' : 'Standar'}
              </span>
              <span className="font-bold text-slate-900">
                Rp {(t.defaultPenaltyAmount || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </Card>
        ))}

      </div>

      {/* Modal: Tambah Jenis Pelanggaran */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Jenis Pelanggaran Baru"
        description="Tetapkan nama pelanggaran, level keparahan, dan besaran denda"
      >
        <form onSubmit={handleCreateType} className="space-y-3.5">
          <Input
            label="Nama Jenis Pelanggaran"
            placeholder="Contoh: Menempel Stiker / Coretan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Deskripsi / Kriteria"
            placeholder="Contoh: Ditemukan stiker atau tulisan yang merusak fasilitas"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tingkat Keparahan"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as ViolationSeverity)}
              options={[
                { value: 'low', label: 'Ringan' },
                { value: 'medium', label: 'Sedang' },
                { value: 'high', label: 'Tinggi' },
                { value: 'critical', label: 'Kritis' },
              ]}
            />
            <Input
              type="number"
              min={0}
              step={5000}
              label="Denda Standar (IDR)"
              value={defaultPenalty}
              onChange={(e) => setDefaultPenalty(parseInt(e.target.value) || 0)}
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Aturan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
