import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  AlertTriangle,
  Receipt,
  Boxes,
  ArrowRight,
  PlusCircle,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Card, Button, Badge, LoadingState } from '../../components/common';

import { DataService } from '../../services/dataService';
import type { Inspection, Violation, Penalty, InventoryItem, Schedule } from '../../types';

export const CleanerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [insp, viol, pen, inv, sched] = await Promise.all([
          DataService.getInspections(),
          DataService.getViolations(),
          DataService.getPenalties(),
          DataService.getInventories(),
          DataService.getSchedules(),
        ]);
        setInspections(insp);
        setViolations(viol);
        setPenalties(pen);
        setInventories(inv);
        setSchedules(sched);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return <LoadingState message="Memuat ringkasan kebersihan..." />;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayInspections = inspections.filter((i) => i.date === todayStr);
  const pendingPenalties = penalties.filter((p) => p.status === 'pending');
  const lowStockItems = inventories.filter((i) => i.stock <= i.minStockAlert);
  const totalPendingFines = pendingPenalties.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
            Panel Kerja Petugas Kebersihan
          </span>
          <h2 className="text-lg font-bold mt-0.5">Semangat Menjaga Kebersihan!</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-[280px]">
            "Kebersihan adalah sebagian dari iman." Catat dan pantau kebersihan lingkungan pondok setiap hari.
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="p-3 bg-white border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Inspeksi Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{todayInspections.length}</span>
            <span className="text-xs text-slate-400 ml-1">selesai</span>
          </div>
        </Card>

        <Card className="p-3 bg-white border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pelanggaran</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-rose-600">
              {violations.filter((v) => v.status !== 'cancelled').length}
            </span>
            <span className="text-xs text-slate-400 ml-1">aktif</span>
          </div>
        </Card>

        <Card className="p-3 bg-white border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Denda Tertunda</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-amber-700">
              Rp {totalPendingFines.toLocaleString('id-ID')}
            </span>
            <div className="text-[10px] text-slate-400">{pendingPenalties.length} sanksi aktif</div>
          </div>
        </Card>

        <Card className="p-3 bg-white border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Stok Kritis</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{lowStockItems.length}</span>
            <span className="text-xs text-slate-400 ml-1">perlu restock</span>
          </div>
        </Card>
      </div>

      {/* Quick Action Bar */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Aksi Cepat</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            size="md"
            className="w-full justify-start text-xs font-semibold"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => navigate('/cleaner/inspections')}
          >
            Mulai Periksa
          </Button>
          <Button
            variant="outline"
            size="md"
            className="w-full justify-start text-xs font-semibold border-slate-300"
            leftIcon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
            onClick={() => navigate('/cleaner/violations')}
          >
            Catat Masalah
          </Button>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Jadwal Tugas Harian</h3>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Hari ini
          </span>
        </div>

        <div className="space-y-2">
          {schedules.map((sched) => (
            <Card key={sched.id} className="p-3 bg-white hover:border-emerald-200 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{sched.areaName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {sched.timeSlot}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{sched.frequency}</span>
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  Tugaskan
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Inspections History */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pemeriksaan Terakhir</h3>
          <button
            onClick={() => navigate('/cleaner/inspections')}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
          >
            Lihat Semua <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {inspections.slice(0, 3).map((insp) => (
            <Card key={insp.id} className="p-3 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{insp.areaName}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {insp.date} • {insp.inspectorName}
                  </p>
                </div>
                <div className="text-right">
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
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    Skor: {insp.totalScore ?? '-'}%
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
      </div>
    </div>
  );
};
