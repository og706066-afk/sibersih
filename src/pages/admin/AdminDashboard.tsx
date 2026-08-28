import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  AlertTriangle,
  Receipt,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { Card, Button, Badge, LoadingState, Modal } from '../../components/common';

import { DataService } from '../../services/dataService';
import { useAuth } from '../../contexts/AuthContext';
import type {
  ClassRoom,
  Area,
  Inspection,
  Violation,
  Penalty,
  InventoryItem,
} from '../../types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isFirebaseActive } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [seedMessage, setSeedMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [inventories, setInventories] = useState<InventoryItem[]>([]);

  const loadAdminData = async () => {
    try {
      const [cls, ar, insp, viol, pen, inv] = await Promise.all([
        DataService.getClasses(),
        DataService.getAreas(),
        DataService.getInspections(),
        DataService.getViolations(),
        DataService.getPenalties(),
        DataService.getInventories(),
      ]);
      setClasses(cls);
      setAreas(ar);
      setInspections(insp);
      setViolations(viol);
      setPenalties(pen);
      setInventories(inv);
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleOpenSeedConfirm = () => {
    setShowConfirmModal(true);
  };

  const executeSeedMasterData = async () => {
    setShowConfirmModal(false);
    setIsSeeding(true);
    setSeedMessage(null);
    try {
      const result = await DataService.seedInitialDataToFirestore();
      if (result.success) {
        setSeedMessage({ type: 'success', text: result.message });
      } else {
        setSeedMessage({ type: 'error', text: result.message });
      }
      await loadAdminData();
    } catch (err: any) {
      setSeedMessage({ type: 'error', text: err?.message || 'Gagal inisialisasi master data.' });
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Memuat panel Developer/Admin..." />;
  }

  const totalPenaltiesAmount = penalties.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-4 text-white shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
          Developer & Admin Console
        </span>
        <h2 className="text-xl font-bold mt-0.5">SIBERSIH Control Panel</h2>
        <p className="text-xs text-slate-300 mt-1">
          Pusat kendali master data, pengguna, keamanan peran, dan database Firestore.
        </p>

        <div className="mt-3.5 pt-3 border-t border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs">
            {isFirebaseActive ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <Cloud className="w-4 h-4" /> Cloud Firestore Terhubung
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <CloudOff className="w-4 h-4" /> Mode Mandiri / Demo Aktif
              </span>
            )}
          </div>

          <Badge variant={isFirebaseActive ? 'success' : 'warning'} size="sm">
            {isFirebaseActive ? 'Production' : 'Dev / Ujikom'}
          </Badge>
        </div>
      </div>

      {/* Cloud Firestore Sync Section */}
      <Card className="p-3.5 bg-white border-indigo-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Inisialisasi Master Data Cloud Firestore</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
              Unggah koleksi data awal (kelas, area, checklist, aturan denda, inventaris) ke database Firebase.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0 ml-2"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />}
            isLoading={isSeeding}
            onClick={handleOpenSeedConfirm}
          >
            Inisialisasi Master Data
          </Button>
        </div>

        {seedMessage && (
          <div
            className={`mt-2.5 p-2 rounded-xl text-xs font-medium ${
              seedMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {seedMessage.text}
          </div>
        )}
      </Card>

      {/* System Metrics Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Statistik Master Data
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <Card
            hoverEffect
            onClick={() => navigate('/admin/areas')}
            className="p-3 bg-white flex items-center justify-between"
          >
            <div>
              <span className="text-xs text-slate-500 font-medium">Ruang & Kelas</span>
              <div className="text-xl font-bold text-slate-900 mt-1">{classes.length} Kelas</div>
              <span className="text-[11px] text-slate-400">{areas.length} Area • {inspections.length} Inspeksi</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </Card>

          <Card
            hoverEffect
            onClick={() => navigate('/admin/users')}
            className="p-3 bg-white flex items-center justify-between"
          >
            <div>
              <span className="text-xs text-slate-500 font-medium">Pengguna</span>
              <div className="text-xl font-bold text-slate-900 mt-1">3 Peran</div>
              <span className="text-[11px] text-slate-400">Admin, Petugas, Guru</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </Card>

          <Card
            hoverEffect
            onClick={() => navigate('/admin/violations')}
            className="p-3 bg-white flex items-center justify-between"
          >
            <div>
              <span className="text-xs text-slate-500 font-medium">Pelanggaran</span>
              <div className="text-xl font-bold text-rose-600 mt-1">
                {violations.length} Kasus
              </div>
              <span className="text-[11px] text-slate-400">Tercatat</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </Card>

          <Card className="p-3 bg-white flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">Total Kas Denda</span>
              <div className="text-sm font-bold text-amber-700 mt-1">
                Rp {totalPenaltiesAmount.toLocaleString('id-ID')}
              </div>
              <span className="text-[11px] text-slate-400">{penalties.length} Tagihan • {inventories.length} Barang</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </Card>

        </div>
      </div>

      {/* Quick Navigation Panels */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Modul Konfigurasi
        </h3>

        <div className="space-y-2">
          <Card
            hoverEffect
            onClick={() => navigate('/admin/users')}
            className="p-3 bg-white flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Kelola Akun & Hak Akses</h4>
                <p className="text-[11px] text-slate-500">
                  Daftar pengguna dan penugasan peran (Role-Based Access)
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Card>

          <Card
            hoverEffect
            onClick={() => navigate('/admin/areas')}
            className="p-3 bg-white flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Kelola Ruang Kelas & Area</h4>
                <p className="text-[11px] text-slate-500">
                  Master data gedung, ruangan, dan penugasan wali kelas
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Card>

          <Card
            hoverEffect
            onClick={() => navigate('/admin/violations')}
            className="p-3 bg-white flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Jenis Pelanggaran & Aturan Denda</h4>
                <p className="text-[11px] text-slate-500">
                  Konfigurasi nominal sanksi denda dan level keparahan
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Card>

          <Card
            hoverEffect
            onClick={() => navigate('/admin/settings')}
            className="p-3 bg-white flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Pengaturan Sistem & Firebase</h4>
                <p className="text-[11px] text-slate-500">
                  Status environment variable dan konfigurasi Android Capacitor
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Card>
        </div>
      </div>

      {/* Confirmation Modal for Production Master Data Seed */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Inisialisasi Master Data Production"
        size="sm"
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmModal(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={executeSeedMasterData}
            >
              Lanjutkan
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600">
          <p className="text-sm font-medium text-slate-800">
            Fitur ini hanya mengisi master data yang belum tersedia. Data operasional dan data yang sudah ada tidak akan dibuat ulang atau dihapus. Lanjutkan?
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-600">
            <p className="font-semibold text-slate-700">Master data yang akan diinisialisasi jika belum ada:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Master Kelas (X IPA 1, X IPA 2, XI IPA 1 tanpa mock UID)</li>
              <li>Master Area & Ruang Lingkungan Pesantren</li>
              <li>Master Jenis Pelanggaran Kebersihan</li>
              <li>Master Aturan & Tarif Sanksi Denda</li>
              <li>Katalog Barang & Sarpras Inventaris (tanpa reset stok)</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};
