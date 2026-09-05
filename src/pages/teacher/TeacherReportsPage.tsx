import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Calendar,
  Filter,
  AlertTriangle,
  Receipt,
  ClipboardCheck,
  TrendingUp,
  Printer,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';

import {
  Card,
  Badge,
  Modal,
  Input,
  LoadingState,
  EmptyState,
  Button,
} from '../../components/common';
import { DataService } from '../../services/dataService';
import { useAuth } from '../../contexts/AuthContext';
import {
  getIndicatorDescription,
  getCleanlinessPredicate,
  getCleanlinessLabel,
  getCleanlinessBadgeVariant,
} from '../../utils/inspectionUtils';
import type {
  Inspection,
  InspectionItem,
  Violation,
  Penalty,
  ClassRoom,
  TeacherClassAssignment,
} from '../../types';

type DateFilterPreset = 'all' | 'today' | '7d' | '30d' | 'custom';
type ReportCategory = 'all' | 'inspections' | 'violations' | 'penalties';

interface UnifiedTeacherReportItem {
  id: string;
  category: 'inspection' | 'violation' | 'penalty';
  date: string;
  title: string;
  subtitle: string;
  locationName: string;
  actorName: string;
  statusBadge: React.ReactNode;
  valueHighlight: string;
  rawInspection?: Inspection;
  rawViolation?: Violation;
  rawPenalty?: Penalty;
}

export const TeacherReportsPage: React.FC = () => {
  const { currentUser } = useAuth();

  // State Datasets
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [assignments, setAssignments] = useState<TeacherClassAssignment[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<UnifiedTeacherReportItem | null>(null);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Load Teacher-Scoped Data
  const loadTeacherReports = async () => {
    try {
      const [clsData, assignData] = await Promise.all([
        DataService.getClasses(),
        DataService.getTeacherAssignments(currentUser?.uid),
      ]);
      setClasses(clsData);
      setAssignments(assignData);

      if (assignData.length === 0) {
        setIsLoading(false);
        return;
      }

      const assignedClassId = assignData[0].classId;
      const [inspData, violData, penData] = await Promise.all([
        DataService.getInspections(assignedClassId),
        DataService.getViolations(assignedClassId),
        DataService.getPenalties(assignedClassId),
      ]);

      setInspections(inspData);
      setViolations(violData);
      setPenalties(penData);
    } catch (err) {
      console.error('Failed to load teacher report data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTeacherReports();
  }, [currentUser]);

  // Date Filtering logic
  const isDateInRange = useCallback(
    (itemDate: string): boolean => {
      if (!itemDate) return true;
      const today = new Date().toISOString().split('T')[0];

      if (datePreset === 'all') return true;
      if (datePreset === 'today') return itemDate === today;

      const itemTime = new Date(itemDate).getTime();
      if (datePreset === '7d') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return itemTime >= sevenDaysAgo;
      }
      if (datePreset === '30d') {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return itemTime >= thirtyDaysAgo;
      }
      if (datePreset === 'custom') {
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        return true;
      }
      return true;
    },
    [datePreset, startDate, endDate]
  );

  // Filtered Datasets
  const filteredInspections = useMemo(() => {
    return inspections.filter((insp) => isDateInRange(insp.date));
  }, [inspections, isDateInRange]);

  const filteredViolations = useMemo(() => {
    return violations.filter((viol) => isDateInRange(viol.date));
  }, [violations, isDateInRange]);

  const filteredPenalties = useMemo(() => {
    return penalties.filter((pen) => isDateInRange(pen.issuedDate));
  }, [penalties, isDateInRange]);

  // KPI Calculations
  const kpiMetrics = useMemo(() => {
    const totalInspections = filteredInspections.length;
    const scores = filteredInspections
      .map((i) => i.totalScore)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const totalViolations = filteredViolations.length;

    const paidPenalties = filteredPenalties.filter((p) => p.status === 'paid');
    const totalPaidAmount = paidPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingPenalties = filteredPenalties.filter((p) => (p.status || 'pending') === 'pending');
    const totalPendingAmount = pendingPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalInspections,
      avgScore,
      totalViolations,
      totalPaidAmount,
      totalPendingAmount,
      paidCount: paidPenalties.length,
      pendingCount: pendingPenalties.length,
    };
  }, [filteredInspections, filteredViolations, filteredPenalties]);

  // Unified Feed Transformation
  const unifiedItems = useMemo(() => {
    const items: UnifiedTeacherReportItem[] = [];

    if (selectedCategory === 'all' || selectedCategory === 'inspections') {
      for (const insp of filteredInspections) {
        items.push({
          id: `insp-${insp.id}`,
          category: 'inspection',
          date: insp.date,
          title: `Pemeriksaan: ${insp.areaName}`,
          subtitle: insp.notes || (insp.hasViolations ? 'Ada catatan temuan' : 'Kondisi ruangan bersih'),
          locationName: insp.areaName,
          actorName: insp.inspectorName || 'Petugas Kebersihan',
          statusBadge: (
            <Badge variant={getCleanlinessBadgeVariant(insp.totalScore ?? 0)} size="sm">
              {getCleanlinessPredicate(insp.totalScore ?? 0)}
            </Badge>
          ),
          valueHighlight: `Skor ${insp.totalScore ?? 0}%`,
          rawInspection: insp,
        });
      }
    }

    if (selectedCategory === 'all' || selectedCategory === 'violations') {
      for (const viol of filteredViolations) {
        const isCancelled = viol.status === 'cancelled';
        items.push({
          id: `viol-${viol.id}`,
          category: 'violation',
          date: viol.date,
          title: `Temuan: ${viol.violationTypeName}`,
          subtitle: viol.description || (viol.penaltyCreated ? 'Denda Diterbitkan' : 'Peringatan Kebersihan'),
          locationName: viol.areaName,
          actorName: viol.reportedByName || 'Petugas Kebersihan',
          statusBadge: isCancelled ? (
            <Badge variant="neutral" size="sm">Dibatalkan</Badge>
          ) : viol.severity === 'high' || viol.severity === 'critical' ? (
            <Badge variant="danger" size="sm">Berat</Badge>
          ) : (
            <Badge variant="warning" size="sm">Sedang</Badge>
          ),
          valueHighlight: isCancelled ? 'Dibatalkan' : viol.penaltyCreated ? 'Denda Terbit' : 'Peringatan',
          rawViolation: viol,
        });
      }
    }

    if (selectedCategory === 'all' || selectedCategory === 'penalties') {
      for (const pen of filteredPenalties) {
        const status = pen.status || 'pending';
        items.push({
          id: `pen-${pen.id}`,
          category: 'penalty',
          date: pen.issuedDate,
          title: `Denda Kas: ${pen.className || 'Kelas'}`,
          subtitle: pen.reason,
          locationName: pen.className || 'Ruang Kelas',
          actorName: pen.issuedByName || 'Petugas Kebersihan',
          statusBadge:
            status === 'paid' ? (
              <Badge variant="success" size="sm">Lunas</Badge>
            ) : status === 'cancelled' ? (
              <Badge variant="neutral" size="sm">Dibatalkan</Badge>
            ) : (
              <Badge variant="warning" size="sm">Belum Lunas</Badge>
            ),
          valueHighlight: `Rp ${pen.amount.toLocaleString('id-ID')}`,
          rawPenalty: pen,
        });
      }
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.locationName.toLowerCase().includes(query) ||
        item.actorName.toLowerCase().includes(query)
    );
  }, [filteredInspections, filteredViolations, filteredPenalties, selectedCategory, searchQuery]);

  const handleOpenDetail = async (item: UnifiedTeacherReportItem) => {
    setSelectedItem(item);
    setInspectionItems([]);

    if (item.category === 'inspection' && item.rawInspection) {
      setIsLoadingItems(true);
      try {
        const items = await DataService.getInspectionItems(item.rawInspection.id);
        setInspectionItems(items);
      } catch (err) {
        console.error('Failed to load inspection items', err);
      } finally {
        setIsLoadingItems(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <LoadingState message="Memuat laporan kebersihan kelas..." />;
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Laporan & Rekapitulasi Kelas</h2>
          <p className="text-xs text-slate-500">Monitoring rekap kebersihan resmi kelas santri</p>
        </div>
        <EmptyState
          icon={<GraduationCap className="w-8 h-8 text-slate-400" />}
          title="Belum Ada Penugasan Kelas"
          description="Akun Anda belum memiliki penugasan wali kelas aktif. Hubungi bagian administrasi pondok."
        />
      </div>
    );
  }

  const assignedClass = classes.find((c) => c.id === assignments[0].classId) || {
    id: assignments[0].classId,
    name: assignments[0].className || 'Kelas Binaan',
  };

  return (
    <div className="space-y-4">
      {/* SCREEN UI (Hidden on Print) */}
      <div className="space-y-4 no-print">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Laporan Kebersihan Kelas</h2>
            <p className="text-xs text-slate-500">
              Rekapitulasi evaluasi untuk <strong>{assignedClass.name}</strong>
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            className="shrink-0 shadow-xs"
          >
            Cetak Laporan
          </Button>
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="p-3 bg-white border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Pemeriksaan</span>
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {kpiMetrics.totalInspections} Kali
            </div>
            <span className="text-[11px] text-slate-400">Total sesi evaluasi</span>
          </Card>

          <Card className="p-3 bg-white border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Rata-rata Skor</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {kpiMetrics.avgScore}%
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Grade: {getCleanlinessLabel(kpiMetrics.avgScore)}
            </span>
          </Card>

          <Card className="p-3 bg-white border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Pelanggaran</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-900 mt-1">
              {kpiMetrics.totalViolations} Kasus
            </div>
            <span className="text-[11px] text-slate-400">Catatan ketidakbersihan</span>
          </Card>

          <Card className="p-3 bg-white border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Denda Kas Lunas</span>
              <Receipt className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-emerald-700 mt-1">
              Rp {kpiMetrics.totalPaidAmount.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-slate-400">
              Tertunda: Rp {kpiMetrics.totalPendingAmount.toLocaleString('id-ID')}
            </span>
          </Card>
        </div>

        {/* Filter Toolbar */}
        <Card className="p-3.5 bg-white space-y-3">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filter Laporan
            </h3>
          </div>

          <div className="space-y-2.5">
            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Semua Waktu' },
                { id: 'today', label: 'Hari Ini' },
                { id: '7d', label: '7 Hari Terakhir' },
                { id: '30d', label: '30 Hari Terakhir' },
                { id: 'custom', label: 'Kustom' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDatePreset(preset.id as DateFilterPreset)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    datePreset === preset.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                <Input
                  type="date"
                  label="Dari Tanggal"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  label="Sampai Tanggal"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            {/* Category Filter */}
            <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'inspections', label: 'Pemeriksaan' },
                { id: 'violations', label: 'Pelanggaran' },
                { id: 'penalties', label: 'Kas Denda' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as ReportCategory)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Live Search Bar */}
            <div className="relative pt-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari aktivitas laporan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </Card>

        {/* Unified Report Items List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Daftar Riwayat ({unifiedItems.length} Data)</span>
          </div>

          {unifiedItems.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-slate-400" />}
              title="Tidak Ada Data Laporan"
              description="Tidak ditemukan aktivitas kebersihan pada periode atau filter yang dipilih."
            />
          ) : (
            <div className="space-y-2">
              {unifiedItems.map((item) => (
                <Card
                  key={item.id}
                  hoverEffect
                  onClick={() => handleOpenDetail(item)}
                  className="p-3 bg-white flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 shrink-0 mt-0.5">
                      {item.category === 'inspection' ? (
                        <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                      ) : item.category === 'violation' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Receipt className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </span>
                        {item.statusBadge}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" /> {item.date}
                        </span>
                        <span>•</span>
                        <span>{item.actorName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-bold text-slate-800">
                      {item.valueHighlight}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          PRINT-ONLY OFFICIAL FORMAL DOCUMENT TEMPLATE
          ============================================================ */}
      <div className="print-only font-serif p-4 text-black bg-white">
        {/* Kop Surat Resmi */}
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-lg font-bold tracking-wide uppercase">
            SIBERSIH — SISTEM INFORMASI KEBERSIHAN PESANTREN
          </h1>
          <h2 className="text-sm font-semibold tracking-wider uppercase mt-0.5">
            LAPORAN REKAPITULASI & MONITORING KEBERSIHAN KELAS
          </h2>
          <p className="text-[10px] text-slate-700 italic mt-0.5">
            Dokumen Resmi Rekapitulasi Mutu Kebersihan Lingkungan, Checklist Evaluasi, & Kas Denda Santri
          </p>
        </div>

        {/* Metadata Header */}
        <div className="grid grid-cols-2 text-xs border border-slate-400 p-2.5 rounded mb-4 bg-slate-50/50">
          <div className="space-y-1">
            <div><strong>Kelas Binaan:</strong> {assignedClass.name}</div>
            <div><strong>Wali Kelas:</strong> {currentUser?.displayName || 'Ustadz Pembina'}</div>
            <div><strong>Email Akun:</strong> {currentUser?.email}</div>
          </div>
          <div className="space-y-1 text-right">
            <div>
              <strong>Periode Laporan:</strong>{' '}
              {datePreset === 'all'
                ? 'Semua Data'
                : datePreset === 'today'
                ? 'Hari Ini'
                : datePreset === '7d'
                ? '7 Hari Terakhir'
                : datePreset === '30d'
                ? '30 Hari Terakhir'
                : `${startDate || '...'} s.d. ${endDate || '...'}`}
            </div>
            <div><strong>Tanggal Cetak:</strong> {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
            <div><strong>Status Cetak:</strong> Dokumen Sah SIBERSIH</div>
          </div>
        </div>

        {/* Ringkasan Eksekutif */}
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
            I. Ringkasan Eksekutif Mutu Kebersihan Kelas
          </h3>
          <table className="printable-table text-xs">
            <thead>
              <tr>
                <th>Total Pemeriksaan</th>
                <th>Rata-rata Skor</th>
                <th>Predikat Mutu</th>
                <th>Total Pelanggaran</th>
                <th>Kas Denda Lunas</th>
                <th>Kas Denda Tertunda</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center font-bold">{kpiMetrics.totalInspections} Sesi</td>
                <td className="text-center font-bold text-emerald-700">{kpiMetrics.avgScore}%</td>
                <td className="text-center font-semibold">
                  {getCleanlinessLabel(kpiMetrics.avgScore)}
                </td>
                <td className="text-center font-bold text-amber-700">{kpiMetrics.totalViolations} Temuan</td>
                <td className="text-center font-bold text-emerald-700">Rp {kpiMetrics.totalPaidAmount.toLocaleString('id-ID')}</td>
                <td className="text-center font-bold text-rose-700">Rp {kpiMetrics.totalPendingAmount.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabel Riwayat Pemeriksaan */}
        <div className="mb-4 page-break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
            II. Log Pemeriksaan Kebersihan Ruang Kelas
          </h3>
          {filteredInspections.length === 0 ? (
            <p className="text-xs italic text-slate-500">Tidak ada data pemeriksaan pada periode ini.</p>
          ) : (
            <table className="printable-table text-xs">
              <thead>
                <tr>
                  <th className="w-8 text-center">No</th>
                  <th className="w-24">Tanggal</th>
                  <th>Ruang / Area</th>
                  <th>Petugas Pemeriksa</th>
                  <th className="w-16 text-center">Skor</th>
                  <th className="w-20 text-center">Status</th>
                  <th>Catatan Evaluasi</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((insp, idx) => (
                  <tr key={insp.id}>
                    <td className="text-center">{idx + 1}</td>
                    <td>{insp.date}</td>
                    <td>{insp.areaName}</td>
                    <td>{insp.inspectorName}</td>
                    <td className="text-center font-bold">{insp.totalScore ?? 0}%</td>
                    <td className="text-center font-semibold text-[11px]">
                      {getCleanlinessPredicate(insp.totalScore ?? 0)}
                    </td>
                    <td>{insp.notes || (insp.hasViolations ? 'Catatan temuan terlampir' : 'Kondisi rapi & bersih')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tabel Temuan Pelanggaran & Kas Denda */}
        <div className="mb-6 page-break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
            III. Catatan Temuan Pelanggaran & Sanksi Denda Santri
          </h3>
          {filteredViolations.length === 0 ? (
            <p className="text-xs italic text-slate-500">Tidak ada catatan pelanggaran kebersihan pada periode ini.</p>
          ) : (
            <table className="printable-table text-xs">
              <thead>
                <tr>
                  <th className="w-8 text-center">No</th>
                  <th className="w-24">Tanggal</th>
                  <th>Jenis Pelanggaran</th>
                  <th>Tingkat</th>
                  <th>Nominal Sanksi</th>
                  <th>Status Kas</th>
                  <th>Pelapor</th>
                </tr>
              </thead>
              <tbody>
                {filteredViolations.map((viol, idx) => {
                  const matchingPenalty = penalties.find((p) => p.violationId === viol.id);
                  return (
                    <tr key={viol.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{viol.date}</td>
                      <td className="font-semibold">{viol.violationTypeName}</td>
                      <td className="text-center uppercase text-[10px]">{viol.severity}</td>
                      <td className="text-right">
                        {matchingPenalty ? `Rp ${matchingPenalty.amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="text-center font-bold text-[10px]">
                        {matchingPenalty?.status === 'paid' ? 'LUNAS' : matchingPenalty?.status === 'cancelled' ? 'BATAL' : 'BELUM LUNAS'}
                      </td>
                      <td>{viol.reportedByName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Lembar Tanda Tangan & Pengesahan */}
        <div className="pt-6 page-break-inside-avoid">
          <div className="grid grid-cols-2 text-center text-xs">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold mt-0.5">Wali Kelas / Ustadz Pembina</p>
              <div className="h-16"></div>
              <p className="font-bold underline">{currentUser?.displayName || 'Ustadz Pembina'}</p>
              <p className="text-[10px] text-slate-600">NIP / ID: {currentUser?.uid || '-'}</p>
            </div>
            <div>
              <p>Mengesahkan,</p>
              <p className="font-bold mt-0.5">Koordinator Bagian Kebersihan</p>
              <div className="h-16"></div>
              <p className="font-bold underline">Pak Slamet / Tim Kebersihan</p>
              <p className="text-[10px] text-slate-600">Bagian Sarana Prasarana</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title || 'Detail Laporan'}
        description={`Kategori: ${selectedItem?.category.toUpperCase()} • Tanggal: ${selectedItem?.date}`}
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs text-slate-500">Nilai / Sorotan:</span>
                <div className="text-lg font-bold text-slate-900">{selectedItem.valueHighlight}</div>
              </div>
              {selectedItem.statusBadge}
            </div>

            {selectedItem.category === 'inspection' && selectedItem.rawInspection && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Area:</span>
                    <span className="font-bold text-slate-800">{selectedItem.rawInspection.areaName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Petugas:</span>
                    <span className="font-medium text-slate-700">{selectedItem.rawInspection.inspectorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Skor:</span>
                    <span className="font-bold text-emerald-700">{selectedItem.rawInspection.totalScore ?? 0}%</span>
                  </div>
                  {selectedItem.rawInspection.notes && (
                    <div className="pt-1.5 border-t border-slate-200">
                      <span className="text-slate-500 block">Catatan Umum:</span>
                      <p className="text-slate-700 mt-0.5 italic">{selectedItem.rawInspection.notes}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Rincian Checklist Penilaian
                  </h4>
                  {isLoadingItems ? (
                    <LoadingState message="Memuat checklist..." />
                  ) : inspectionItems.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Tidak ada rincian sub-checklist.</p>
                  ) : (
                    <div className="space-y-2">
                      {inspectionItems.map((it) => (
                        <div
                          key={it.id}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-800 block">{it.itemName}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              {getIndicatorDescription(it.itemName)}
                            </p>
                            {it.notes && (
                              <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-block">
                                <span className="font-semibold">Temuan:</span> {it.notes}
                              </p>
                            )}
                          </div>
                          <Badge variant={it.passed ? 'success' : 'danger'} size="sm" className="shrink-0 mt-0.5">
                            {it.passed ? 'Lolos (100)' : 'Tidak Lolos (40)'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
