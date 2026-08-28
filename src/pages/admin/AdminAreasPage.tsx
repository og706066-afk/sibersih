import React, { useState, useEffect } from 'react';
import { Building2, Plus, MapPin, GraduationCap } from 'lucide-react';

import { Card, Button, Badge, Modal, Input, Select, LoadingState } from '../../components/common';
import { DataService } from '../../services/dataService';
import type { ClassRoom, Area, AreaCategory } from '../../types';

export const AdminAreasPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classes' | 'areas'>('classes');

  // Modals
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);

  // New Class Form
  const [className, setClassName] = useState('');
  const [classGrade, setClassGrade] = useState('10');
  const [classBuilding, setClassBuilding] = useState('Gedung Umar bin Khattab');
  const [teacherName, setTeacherName] = useState('Ustadz Syarif Hidayatullah');

  // New Area Form
  const [areaName, setAreaName] = useState('');
  const [areaCategory, setAreaCategory] = useState<AreaCategory>('class');
  const [areaBuilding, setAreaBuilding] = useState('Gedung Umar bin Khattab');
  const [areaFloor, setAreaFloor] = useState(1);
  const [areaDesc, setAreaDesc] = useState('');

  const loadData = async () => {
    try {
      const [cls, ar] = await Promise.all([
        DataService.getClasses(),
        DataService.getAreas(),
      ]);
      setClasses(cls);
      setAreas(ar);
    } catch (err) {
      console.error('Failed to load areas', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    await DataService.addClass({
      name: className,
      grade: classGrade,
      building: classBuilding,
      homeroomTeacherName: teacherName,
      isActive: true,
    });
    setIsClassModalOpen(false);
    setClassName('');
    await loadData();
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    await DataService.addArea({
      name: areaName,
      category: areaCategory,
      building: areaBuilding,
      floor: areaFloor,
      description: areaDesc,
      isActive: true,
    });
    setIsAreaModalOpen(false);
    setAreaName('');
    setAreaDesc('');
    await loadData();
  };

  if (isLoading) {
    return <LoadingState message="Memuat data kelas & area..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Kelas & Area Pesantren</h2>
          <p className="text-xs text-slate-500">Master data lokasi inspeksi kebersihan</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => (activeTab === 'classes' ? setIsClassModalOpen(true) : setIsAreaModalOpen(true))}
        >
          {activeTab === 'classes' ? 'Tambah Kelas' : 'Tambah Area'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/70 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'classes'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Daftar Ruang Kelas ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab('areas')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'areas'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Semua Area Fasilitas ({areas.length})
        </button>
      </div>

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="space-y-2.5">
          {classes.map((cls) => (
            <Card key={cls.id} className="p-3.5 bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Kelas {cls.name}</span>
                  <Badge variant="neutral" size="sm">Tingkat {cls.grade}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> {cls.building}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-slate-400" /> {cls.homeroomTeacherName}
                  </span>
                </div>
              </div>
              <Badge variant="success" size="sm">Aktif</Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Areas Tab */}
      {activeTab === 'areas' && (
        <div className="space-y-2.5">
          {areas.map((ar) => (
            <Card key={ar.id} className="p-3.5 bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{ar.name}</span>
                  <Badge variant="info" size="sm">
                    {ar.category === 'class' ? 'Ruang Kelas' : ar.category === 'bathroom' ? 'Toilet' : 'Fasilitas Umum'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> {ar.building} • Lantai {ar.floor}
                </p>
                {ar.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{ar.description}</p>
                )}
              </div>
              <Badge variant="success" size="sm">Dipantau</Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Tambah Kelas */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Tambah Ruang Kelas Baru"
        description="Daftarkan kelas santri dan tetapkan wali kelas"
      >
        <form onSubmit={handleCreateClass} className="space-y-3.5">
          <Input
            label="Nama Kelas"
            placeholder="Contoh: XI IPA 2"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            required
          />
          <Select
            label="Tingkat / Jenjang"
            value={classGrade}
            onChange={(e) => setClassGrade(e.target.value)}
            options={[
              { value: '7', label: 'Kelas 7 (MTs / SMP)' },
              { value: '8', label: 'Kelas 8 (MTs / SMP)' },
              { value: '9', label: 'Kelas 9 (MTs / SMP)' },
              { value: '10', label: 'Kelas 10 (MA / SMA)' },
              { value: '11', label: 'Kelas 11 (MA / SMA)' },
              { value: '12', label: 'Kelas 12 (MA / SMA)' },
            ]}
          />
          <Input
            label="Gedung / Lokasi"
            value={classBuilding}
            onChange={(e) => setClassBuilding(e.target.value)}
            required
          />
          <Input
            label="Nama Wali Kelas (Ustadz/ah)"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            required
          />
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsClassModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Kelas
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Tambah Area */}
      <Modal
        isOpen={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
        title="Tambah Area / Fasilitas"
        description="Daftarkan lokasi pemeriksaan kebersihan baru"
      >
        <form onSubmit={handleCreateArea} className="space-y-3.5">
          <Input
            label="Nama Area"
            placeholder="Contoh: Ruang Makan Santri Putri"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            required
          />
          <Select
            label="Kategori Area"
            value={areaCategory}
            onChange={(e) => setAreaCategory(e.target.value as AreaCategory)}
            options={[
              { value: 'class', label: 'Ruang Kelas' },
              { value: 'bathroom', label: 'Toilet / Tempat Wudhu' },
              { value: 'hallway', label: 'Koridor / Lorong' },
              { value: 'canteen', label: 'Kantin / Dapur' },
              { value: 'yard', label: 'Halaman / Lapangan' },
              { value: 'prayer_room', label: 'Masjid / Musholla' },
              { value: 'office', label: 'Kantor / Ruang Guru' },
              { value: 'other', label: 'Lainnya' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Gedung"
              value={areaBuilding}
              onChange={(e) => setAreaBuilding(e.target.value)}
              required
            />
            <Input
              type="number"
              min={1}
              label="Lantai"
              value={areaFloor}
              onChange={(e) => setAreaFloor(parseInt(e.target.value) || 1)}
              required
            />
          </div>
          <Input
            label="Keterangan Fasilitas (Opsional)"
            placeholder="Contoh: 8 wastafel, 4 bilik"
            value={areaDesc}
            onChange={(e) => setAreaDesc(e.target.value)}
          />
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAreaModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Area
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
