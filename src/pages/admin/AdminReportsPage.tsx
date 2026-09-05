import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ClipboardCheck,
  TrendingUp,
  Clock,
  Ban,
  Camera,
  MapPin,
  User,
  ChevronRight,
  X,
  Printer,
} from 'lucide-react';

import {
  Card,
  Badge,
  Modal,
  Input,
  Select,
  LoadingState,
  EmptyState,
  Button,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { DataService } from '../../services/dataService';
import {
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
  Area,
} from '../../types';

type DateFilterPreset = 'all' | 'today' | '7d' | '30d' | 'custom';
type ReportCategory = 'all' | 'inspections' | 'violations' | 'penalties';

interface UnifiedReportItem {
  id: string;
  category: 'inspection' | 'violation' | 'penalty';
  date: string;
  title: string;
  subtitle: string;
  locationName: string;
  classId?: string;
  areaId?: string;
  actorName: string;
  statusBadge: React.ReactNode;
  valueHighlight: string;
  rawInspection?: Inspection;
  rawViolation?: Violation;
  rawPenalty?: Penalty;
}

export const AdminReportsPage: React.FC = () => {
  const { currentUser } = useAuth();
  // Primary Collections
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<UnifiedReportItem | null>(null);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Initial Data Fetching in Parallel
  const loadAllData = async () => {
    try {
      const [inspData, violData, penData, clsData, areaData] = await Promise.all([
        DataService.getInspections(),
        DataService.getViolations(),
        DataService.getPenalties(),
        DataService.getClasses(),
        DataService.getAreas(),
      ]);
      setInspections(inspData);
      setViolations(violData);
      setPenalties(penData);
      setClasses(clsData);
      setAreas(areaData);
    } catch (err) {
      console.error('Failed to load reporting data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAllData();
  }, []);

  // Helper Date Filtering logic
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

  // Filtered Raw Datasets
  const filteredInspections = useMemo(() => {
    return inspections.filter((insp) => {
      if (!isDateInRange(insp.date)) return false;
      if (selectedClassId !== 'all' && insp.classId !== selectedClassId) return false;
      if (selectedAreaId !== 'all' && insp.areaId !== selectedAreaId) return false;
      return true;
    });
  }, [inspections, isDateInRange, selectedClassId, selectedAreaId]);

  const filteredViolations = useMemo(() => {
    return violations.filter((viol) => {
      if (!isDateInRange(viol.date)) return false;
      if (selectedClassId !== 'all' && viol.classId !== selectedClassId) return false;
      if (selectedAreaId !== 'all' && viol.areaId !== selectedAreaId) return false;
      return true;
    });
  }, [violations, isDateInRange, selectedClassId, selectedAreaId]);

  const filteredPenalties = useMemo(() => {
    return penalties.filter((pen) => {
      if (!isDateInRange(pen.issuedDate)) return false;
      if (selectedClassId !== 'all' && pen.classId !== selectedClassId) return false;
      return true;
    });
  }, [penalties, isDateInRange, selectedClassId]);

  // Executive KPI Calculations
  const kpiMetrics = useMemo(() => {
    const totalInspections = filteredInspections.length;

    const scores = filteredInspections
      .map((i) => i.totalScore)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));
    const avgCleanlinessScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const totalViolations = filteredViolations.length;

    const paidPenalties = filteredPenalties.filter((p) => p.status === 'paid');
    const totalPaidAmount = paidPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingPenalties = filteredPenalties.filter((p) => (p.status || 'pending') === 'pending');
    const totalPendingAmount = pendingPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);

    const cancelledPenalties = filteredPenalties.filter((p) => p.status === 'cancelled');
    const totalCancelledAmount = cancelledPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalInspections,
      avgCleanlinessScore,
      totalViolations,
      totalPaidAmount,
      totalPendingAmount,
      totalCancelledAmount,
      paidCount: paidPenalties.length,
      pendingCount: pendingPenalties.length,
      cancelledCount: cancelledPenalties.length,
    };
  }, [filteredInspections, filteredViolations, filteredPenalties]);

  // Unified Feed Transformation
  const unifiedItems = useMemo(() => {
    const items: UnifiedReportItem[] = [];

    // Inspections mapping
    if (selectedCategory === 'all' || selectedCategory === 'inspections') {
      for (const insp of filteredInspections) {
        const scoreText = insp.totalScore !== undefined ? `${insp.totalScore}/100` : 'Selesai';

        items.push({
          id: `insp-${insp.id}`,
          category: 'inspection',
          date: insp.date,
          title: `Pemeriksaan: ${insp.areaName}`,
          subtitle: insp.notes || (insp.hasViolations ? 'Terdapat catatan temuan' : 'Kondisi area bersih'),
          locationName: insp.areaName,
          classId: insp.classId,
          areaId: insp.areaId,
          actorName: insp.inspectorName || 'Petugas Kebersihan',
          statusBadge: (
            <Badge variant={getCleanlinessBadgeVariant(insp.totalScore ?? 0)} size="sm">
              {getCleanlinessPredicate(insp.totalScore ?? 0)}
            </Badge>
          ),
          valueHighlight: `Skor ${scoreText}`,
          rawInspection: insp,
        });
      }
    }

    // Violations mapping
    if (selectedCategory === 'all' || selectedCategory === 'violations') {
      for (const viol of filteredViolations) {
        const isCancelled = viol.status === 'cancelled';
        items.push({
          id: `viol-${viol.id}`,
          category: 'violation',
          date: viol.date,
          title: `Pelanggaran: ${viol.violationTypeName}`,
          subtitle: viol.description,
          locationName: viol.areaName,
          classId: viol.classId,
          areaId: viol.areaId,
          actorName: viol.reportedByName || 'Petugas Kebersihan',
          statusBadge: isCancelled ? (
            <Badge variant="neutral" size="sm">Dibatalkan</Badge>
          ) : viol.severity === 'high' || viol.severity === 'critical' ? (
            <Badge variant="danger" size="sm">Berat</Badge>
          ) : (
            <Badge variant="warning" size="sm">Sedang</Badge>
          ),
          valueHighlight: isCancelled ? 'Dibatalkan' : viol.penaltyCreated ? 'Denda Aktif' : 'Peringatan',
          rawViolation: viol,
        });
      }
    }

    // Penalties mapping
    if (selectedCategory === 'all' || selectedCategory === 'penalties') {
      for (const pen of filteredPenalties) {
        const status = pen.status || 'pending';
        items.push({
          id: `pen-${pen.id}`,
          category: 'penalty',
          date: pen.issuedDate,
          title: `Sanksi Denda: ${pen.className || 'Area Umum'}`,
          subtitle: pen.reason,
          locationName: pen.className || 'Lingkungan Pesantren',
          classId: pen.classId,
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

    // Sort descending by date
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Search query filtering
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.locationName.toLowerCase().includes(query) ||
        item.actorName.toLowerCase().includes(query) ||
        (item.rawPenalty?.receiptNumber || '').toLowerCase().includes(query) ||
        (item.rawPenalty?.responsiblePerson || '').toLowerCase().includes(query)
    );
  }, [filteredInspections, filteredViolations, filteredPenalties, selectedCategory, searchQuery]);

  // Handle Detail Modal Opening (Lazy load inspection_items if inspection)
  const handleOpenDetail = async (item: UnifiedReportItem) => {
    setSelectedItem(item);
    setInspectionItems([]);

    if (item.category === 'inspection' && item.rawInspection) {
      setIsLoadingItems(true);
      try {
        const items = await DataService.getInspectionItems(item.rawInspection.id);
        setInspectionItems(items);
      } catch (err) {
        console.error('Failed to load inspection checklist items', err);
      } finally {
        setIsLoadingItems(false);
      }
    }
  };

  const handleResetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedClassId('all');
    setSelectedAreaId('all');
    setSelectedCategory('all');
    setSearchQuery('');
  };

  if (isLoading) {
    return <LoadingState message="Memuat rekapitulasi data laporan SIBERSIH..." />;
  }

  return (
    <div className="space-y-4">
      {/* Interactive UI (Hidden during print) */}
      <div className="no-print space-y-4">
        {/* Header & Print/Reset Buttons */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Laporan & Rekapitulasi</h2>
            <p className="text-xs text-slate-500">
              Pusat analisis data kebersihan, evaluasi checklist, temuan pelanggaran & kas denda
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
              className="text-xs shrink-0"
            >
              Cetak Laporan
            </Button>
            {(datePreset !== 'all' ||
              selectedClassId !== 'all' ||
              selectedAreaId !== 'all' ||
              selectedCategory !== 'all' ||
              searchQuery) && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<X className="w-3.5 h-3.5" />}
                onClick={handleResetFilters}
                className="text-xs shrink-0"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* KPI Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Total Inspeksi & Nilai Rata-rata */}
        <Card className="p-3 bg-white border-emerald-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pemeriksaan</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ClipboardCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-900">
              {kpiMetrics.totalInspections} <span className="text-xs text-slate-400 font-normal">inspeksi</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Rata-rata: {kpiMetrics.avgCleanlinessScore}/100 ({getCleanlinessPredicate(kpiMetrics.avgCleanlinessScore)})</span>
            </div>
          </div>
        </Card>

        {/* Total Pelanggaran */}
        <Card className="p-3 bg-white border-rose-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pelanggaran</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-rose-600">
              {kpiMetrics.totalViolations} <span className="text-xs text-slate-400 font-normal">kasus</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Temuan ketidakbersihan
            </div>
          </div>
        </Card>

        {/* Kas Denda Diterima (Paid) */}
        <Card className="p-3 bg-white border-emerald-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Kas Denda Lunas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-emerald-700">
              Rp {kpiMetrics.totalPaidAmount.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {kpiMetrics.paidCount} pembayaran kas
            </div>
          </div>
        </Card>

        {/* Kas Denda Tertunda (Pending) */}
        <Card className="p-3 bg-white border-amber-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Denda Tertunda</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-amber-700">
              Rp {kpiMetrics.totalPendingAmount.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {kpiMetrics.pendingCount} tagihan belum lunas
            </div>
          </div>
        </Card>

        {/* Kas Denda Dibatalkan */}
        <Card className="p-3 bg-white border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Denda Dibatalkan</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-slate-700">
              Rp {kpiMetrics.totalCancelledAmount.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {kpiMetrics.cancelledCount} transaksi batal
            </div>
          </div>
        </Card>

        {/* Total Keseluruhan Dokumen */}
        <Card className="p-3 bg-white border-indigo-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Rekap</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-indigo-900">
              {unifiedItems.length} <span className="text-xs text-slate-400 font-normal">data</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Sesuai filter aktif
            </div>
          </div>
        </Card>
      </div>

      {/* Multi-Filter Section */}
      <Card className="p-3.5 bg-white border-slate-200 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Filter Laporan</span>
        </div>

        {/* Preset Date Range Buttons */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { id: 'all', label: 'Semua Waktu' },
            { id: 'today', label: 'Hari Ini' },
            { id: '7d', label: '7 Hari Terakhir' },
            { id: '30d', label: '30 Hari Terakhir' },
            { id: 'custom', label: 'Kustom Tanggal' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDatePreset(preset.id as DateFilterPreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                datePreset === preset.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if Custom selected */}
        {datePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Input
              type="date"
              label="Tanggal Mulai"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="Tanggal Akhir"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

        {/* Dropdowns for Class & Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <Select
            label="Pilih Kelas"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            options={[
              { value: 'all', label: 'Semua Kelas' },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            label="Pilih Area"
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            options={[
              { value: 'all', label: 'Semua Area' },
              ...areas.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>

        {/* Search Input */}
        <Input
          placeholder="Cari kata kunci: lokasi, petugas, pelanggaran, kuitansi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </Card>

      {/* Category Tabs (Semua / Inspeksi / Pelanggaran / Denda) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'Semua Data', count: filteredInspections.length + filteredViolations.length + filteredPenalties.length },
          { id: 'inspections', label: 'Inspeksi', count: filteredInspections.length },
          { id: 'violations', label: 'Pelanggaran', count: filteredViolations.length },
          { id: 'penalties', label: 'Kas Denda', count: filteredPenalties.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id as ReportCategory)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Unified Report Cards List */}
      {unifiedItems.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-slate-400" />}
          title="Tidak Ada Data Laporan"
          description="Tidak ditemukan riwayat data yang cocok dengan kriteria filter dan pencarian yang Anda pilih."
          actionLabel="Reset Filter"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="space-y-2.5">
          {unifiedItems.map((item) => {
            const isInspection = item.category === 'inspection';
            const isViolation = item.category === 'violation';
            const isPenalty = item.category === 'penalty';

            return (
              <Card
                key={item.id}
                hoverEffect
                onClick={() => handleOpenDetail(item)}
                className="p-3.5 bg-white flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isInspection && (
                          <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                            <ClipboardCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {isViolation && (
                          <span className="p-1 rounded-md bg-rose-50 text-rose-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {isPenalty && (
                          <span className="p-1 rounded-md bg-amber-50 text-amber-700">
                            <Receipt className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {item.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.locationName}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-slate-800">
                        {item.valueHighlight}
                      </span>
                      {item.statusBadge}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {item.date}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <User className="w-3 h-3 text-slate-400" /> {item.actorName}
                    <ChevronRight className="w-3 h-3 text-slate-300 ml-0.5" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Detail Rekapitulasi */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title || 'Detail Laporan'}
        description={`Tanggal: ${selectedItem?.date || ''} • Lokasi: ${selectedItem?.locationName || ''}`}
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* DETAIL INSPEKSI */}
            {selectedItem.category === 'inspection' && selectedItem.rawInspection && (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-800 font-medium">Evaluasi Skor Kebersihan</span>
                    <div className="text-2xl font-black text-emerald-900 mt-0.5">
                      {selectedItem.rawInspection.totalScore !== undefined
                        ? `${selectedItem.rawInspection.totalScore} / 100`
                        : 'Selesai'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-800 font-medium block mb-1">Status</span>
                    {selectedItem.statusBadge}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Evaluator / Petugas:</span>
                    <span className="font-bold text-slate-800">{selectedItem.rawInspection.inspectorName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Area Pemeriksaan:</span>
                    <span className="font-semibold text-slate-800">{selectedItem.rawInspection.areaName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Catatan Tambahan Petugas:</span>
                    <p className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                      {selectedItem.rawInspection.notes || 'Tidak ada catatan tambahan.'}
                    </p>
                  </div>
                </div>

                {/* Inspection Checklist Items (Lazy Loaded) */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    Daftar Checklist Elemen Ruang
                  </h4>

                  {isLoadingItems ? (
                    <LoadingState message="Memuat checklist item..." />
                  ) : inspectionItems.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-200">
                      Tidak ada data checklist spesifik untuk pemeriksaan ini.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {inspectionItems.map((it) => (
                        <div
                          key={it.id}
                          className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{it.itemName}</span>
                            {it.notes && <p className="text-[11px] text-slate-500 mt-0.5">{it.notes}</p>}
                          </div>
                          <Badge variant={it.passed ? 'success' : 'danger'} size="sm">
                            {it.passed ? 'Lolos' : 'Tidak Lolos'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DETAIL PELANGGARAN */}
            {selectedItem.category === 'violation' && selectedItem.rawViolation && (
              <div className="space-y-3">
                <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-rose-800 font-medium">Tingkat Keparahan</span>
                    <div className="text-lg font-bold text-rose-900 mt-0.5">
                      {selectedItem.rawViolation.violationTypeName}
                    </div>
                  </div>
                  {selectedItem.statusBadge}
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Pelapor:</span>
                    <span className="font-bold text-slate-800">{selectedItem.rawViolation.reportedByName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Tanggal Temuan:</span>
                    <span className="font-medium text-slate-700">{selectedItem.rawViolation.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Kronologi / Keterangan Temuan:</span>
                    <p className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-700">
                      {selectedItem.rawViolation.description}
                    </p>
                  </div>
                </div>

                {/* Photo Proof Preview if Available */}
                {selectedItem.rawViolation.photoUrls && selectedItem.rawViolation.photoUrls.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-400" /> Foto Bukti Temuan:
                    </span>
                    <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 bg-black flex items-center justify-center">
                      <img
                        src={selectedItem.rawViolation.photoUrls[0]}
                        alt="Bukti Temuan"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Cancellation Details if Cancelled */}
                {selectedItem.rawViolation.status === 'cancelled' && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                    <div className="flex items-center gap-1 font-bold text-rose-800">
                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                      <span>Pelanggaran Dibatalkan</span>
                    </div>
                    <p className="text-rose-700">
                      Alasan: {selectedItem.rawViolation.cancellationReason || 'Tanpa keterangan'}
                    </p>
                    <p className="text-[11px] text-rose-600">
                      Oleh: {selectedItem.rawViolation.cancelledByName || '-'} • {selectedItem.rawViolation.cancelledAt ? new Date(selectedItem.rawViolation.cancelledAt).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* DETAIL DENDA */}
            {selectedItem.category === 'penalty' && selectedItem.rawPenalty && (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Nominal Sanksi</span>
                    <div
                      className={`text-xl font-bold mt-0.5 ${
                        selectedItem.rawPenalty.status === 'cancelled'
                          ? 'text-slate-400 line-through'
                          : selectedItem.rawPenalty.status === 'paid'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      Rp {selectedItem.rawPenalty.amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Status Pembayaran</span>
                    {selectedItem.statusBadge}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Penanggung Jawab:</span>
                    <span className="font-bold text-slate-900">{selectedItem.rawPenalty.responsiblePerson || 'Petugas Piket'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Petugas Penerbit:</span>
                    <span className="font-medium text-slate-800">{selectedItem.rawPenalty.issuedByName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Alasan Denda:</span>
                    <p className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-700">
                      {selectedItem.rawPenalty.reason}
                    </p>
                  </div>
                </div>

                {/* Payment Receipt Info if Paid */}
                {selectedItem.rawPenalty.status === 'paid' && (
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-emerald-100 pb-1.5 font-semibold text-emerald-900">
                      <span>No Kuitansi Kas:</span>
                      <span className="font-mono">{selectedItem.rawPenalty.receiptNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-emerald-100 pb-1.5 text-emerald-800">
                      <span>Waktu Pelunasan:</span>
                      <span>{selectedItem.rawPenalty.paidAt ? new Date(selectedItem.rawPenalty.paidAt).toLocaleString('id-ID') : '-'}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Penerima Kas:</span>
                      <span className="font-bold">{selectedItem.rawPenalty.paidReceivedById || 'Petugas Kebersihan'}</span>
                    </div>
                  </div>
                )}

                {/* Cancellation Info if Cancelled */}
                {selectedItem.rawPenalty.status === 'cancelled' && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1 text-xs text-rose-900">
                    <div className="flex items-center gap-1 font-bold text-rose-800">
                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                      <span>Tagihan Dibatalkan</span>
                    </div>
                    <p className="text-rose-700">
                      Alasan: {selectedItem.rawPenalty.cancellationReason || 'Tanpa keterangan'}
                    </p>
                    <p className="text-[11px] text-rose-600">
                      Dibatalkan oleh: {selectedItem.rawPenalty.cancelledByName || '-'} • {selectedItem.rawPenalty.cancelledAt ? new Date(selectedItem.rawPenalty.cancelledAt).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
      </div>

      {/* ============================================================
          PRINT-ONLY OFFICIAL FORMAL DOCUMENT TEMPLATE (ADMIN)
          ============================================================ */}
      <div className="print-only font-serif p-4 text-black bg-white">
        {/* Kop Surat Resmi */}
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-lg font-bold tracking-wide uppercase">
            SIBERSIH — SISTEM INFORMASI KEBERSIHAN PESANTREN
          </h1>
          <h2 className="text-sm font-semibold tracking-wider uppercase mt-0.5">
            LAPORAN REKAPITULASI & EVALUASI KEBERSIHAN PESANTREN
          </h2>
          <p className="text-[10px] text-slate-700 italic mt-0.5">
            Dokumen Resmi Rekapitulasi Mutu Kebersihan Lingkungan, Checklist Evaluasi, & Kas Denda Santri
          </p>
        </div>

        {/* Metadata Header */}
        <div className="grid grid-cols-2 text-xs border border-slate-400 p-2.5 rounded mb-4 bg-slate-50/50">
          <div className="space-y-1">
            <div>
              <strong>Filter Kelas:</strong>{' '}
              {selectedClassId === 'all'
                ? 'Semua Kelas'
                : classes.find((c) => c.id === selectedClassId)?.name || selectedClassId}
            </div>
            <div>
              <strong>Filter Area:</strong>{' '}
              {selectedAreaId === 'all'
                ? 'Semua Area / Zona Pesantren'
                : areas.find((a) => a.id === selectedAreaId)?.name || selectedAreaId}
            </div>
            <div>
              <strong>Kategori Data:</strong>{' '}
              {selectedCategory === 'all'
                ? 'Seluruh Dokumen (Inspeksi, Pelanggaran, Kas Denda)'
                : selectedCategory === 'inspections'
                ? 'Pemeriksaan Kebersihan'
                : selectedCategory === 'violations'
                ? 'Temuan Pelanggaran'
                : 'Kas & Sanksi Denda'}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div>
              <strong>Periode:</strong>{' '}
              {datePreset === 'all'
                ? 'Semua Data Riwayat'
                : datePreset === 'today'
                ? 'Hari Ini'
                : datePreset === '7d'
                ? '7 Hari Terakhir'
                : datePreset === '30d'
                ? '30 Hari Terakhir'
                : `${startDate || '...'} s.d. ${endDate || '...'}`}
            </div>
            <div>
              <strong>Tanggal Cetak:</strong>{' '}
              {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
            </div>
            <div>
              <strong>Dicetak Oleh:</strong>{' '}
              {currentUser?.displayName || currentUser?.email || 'Administrator Pesantren'}
            </div>
          </div>
        </div>

        {/* I. Ringkasan Eksekutif Mutu & Kas Kebersihan */}
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
            I. Ringkasan Eksekutif Mutu Kebersihan & Kas Pesantren
          </h3>
          <table className="printable-table text-xs">
            <thead>
              <tr>
                <th>Total Pemeriksaan</th>
                <th>Rata-rata Skor</th>
                <th>Predikat Umum</th>
                <th>Total Pelanggaran</th>
                <th>Kas Denda Lunas</th>
                <th>Kas Denda Tertunda</th>
                <th>Denda Dibatalkan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center font-bold">{kpiMetrics.totalInspections} Inspeksi</td>
                <td className="text-center font-bold">{kpiMetrics.avgCleanlinessScore} / 100</td>
                <td className="text-center">
                  <span className="font-semibold">
                    {getCleanlinessLabel(kpiMetrics.avgCleanlinessScore)}
                  </span>
                </td>
                <td className="text-center text-rose-700 font-bold">{kpiMetrics.totalViolations} Kasus</td>
                <td className="text-right font-bold text-emerald-800">
                  Rp {kpiMetrics.totalPaidAmount.toLocaleString('id-ID')}
                </td>
                <td className="text-right font-bold text-amber-800">
                  Rp {kpiMetrics.totalPendingAmount.toLocaleString('id-ID')}
                </td>
                <td className="text-right text-slate-500">
                  Rp {kpiMetrics.totalCancelledAmount.toLocaleString('id-ID')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* II. Rekapitulasi Pemeriksaan Kebersihan */}
        {(selectedCategory === 'all' || selectedCategory === 'inspections') && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
              II. Rekapitulasi Hasil Pemeriksaan Kebersihan ({filteredInspections.length} Data)
            </h3>
            {filteredInspections.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Tidak ada data pemeriksaan kebersihan pada filter/periode yang dipilih.
              </p>
            ) : (
              <table className="printable-table text-[11px]">
                <thead>
                  <tr>
                    <th className="w-8 text-center">No</th>
                    <th>Tanggal</th>
                    <th>Lokasi / Area</th>
                    <th>Kelas</th>
                    <th>Petugas Pemeriksa</th>
                    <th className="text-center">Skor</th>
                    <th className="text-center">Status</th>
                    <th>Catatan Evaluasi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspections.map((insp, idx) => (
                    <tr key={insp.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{insp.date}</td>
                      <td className="font-semibold">{insp.areaName}</td>
                      <td>{insp.classId ? (classes.find((c) => c.id === insp.classId)?.name || insp.classId) : '-'}</td>
                      <td>{insp.inspectorName}</td>
                      <td className="text-center font-bold">{insp.totalScore ?? '-'}%</td>
                      <td className="text-center font-semibold">
                        {getCleanlinessPredicate(insp.totalScore ?? 0)}
                      </td>
                      <td className="text-slate-600">{insp.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* III. Log Temuan Pelanggaran Kebersihan */}
        {(selectedCategory === 'all' || selectedCategory === 'violations') && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
              III. Log Temuan Pelanggaran Kebersihan ({filteredViolations.length} Kasus)
            </h3>
            {filteredViolations.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Tidak ada temuan pelanggaran kebersihan pada filter/periode yang dipilih.
              </p>
            ) : (
              <table className="printable-table text-[11px]">
                <thead>
                  <tr>
                    <th className="w-8 text-center">No</th>
                    <th>Tanggal</th>
                    <th>Lokasi Temuan</th>
                    <th>Jenis Pelanggaran</th>
                    <th>Tingkat Keparahan</th>
                    <th>Petugas Pelapor</th>
                    <th>Status Sanksi</th>
                    <th>Deskripsi / Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.map((viol, idx) => (
                    <tr key={viol.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{viol.date}</td>
                      <td>{viol.areaName}</td>
                      <td className="font-semibold">{viol.violationTypeName}</td>
                      <td className="capitalize">{viol.severity}</td>
                      <td>{viol.reportedByName}</td>
                      <td>
                        {viol.status === 'cancelled'
                          ? 'Dibatalkan'
                          : viol.penaltyCreated
                          ? 'Denda Diterbitkan'
                          : 'Peringatan'}
                      </td>
                      <td className="text-slate-600">{viol.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* IV. Rekapitulasi Kas & Sanksi Denda */}
        {(selectedCategory === 'all' || selectedCategory === 'penalties') && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
              IV. Rekapitulasi Kas & Sanksi Denda ({filteredPenalties.length} Transaksi)
            </h3>
            {filteredPenalties.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Tidak ada data kas denda pada filter/periode yang dipilih.
              </p>
            ) : (
              <table className="printable-table text-[11px]">
                <thead>
                  <tr>
                    <th className="w-8 text-center">No</th>
                    <th>Tanggal Terbit</th>
                    <th>Kelas / Penanggung Jawab</th>
                    <th className="text-right">Nominal Sanksi</th>
                    <th className="text-center">Status Pembayaran</th>
                    <th>No. Kuitansi</th>
                    <th>Penerima Kas</th>
                    <th>Alasan Denda</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPenalties.map((pen, idx) => (
                    <tr key={pen.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{pen.issuedDate}</td>
                      <td className="font-semibold">{pen.className || pen.responsiblePerson || 'Piket Ruang'}</td>
                      <td className="text-right font-bold">
                        Rp {pen.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="text-center uppercase font-semibold">
                        {pen.status === 'paid'
                          ? 'Lunas'
                          : pen.status === 'cancelled'
                          ? 'Batal'
                          : 'Belum Lunas'}
                      </td>
                      <td className="font-mono">{pen.receiptNumber || '-'}</td>
                      <td>{pen.paidReceivedById || '-'}</td>
                      <td className="text-slate-600">{pen.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* V. Evaluasi & Catatan Umum */}
        <div className="mb-4 border border-slate-300 p-2.5 rounded bg-slate-50/30 text-xs">
          <h3 className="font-bold uppercase tracking-wider text-slate-800 mb-1">
            V. Catatan Evaluasi & Rekomendasi Pengasuhan
          </h3>
          <p className="text-slate-700 leading-relaxed text-[11px]">
            Laporan ini dihimpun secara otomatis dari sistem informasi kebersihan SIBERSIH berdasarkan
            pemeriksaan berkala unit kebersihan dan pengawasan asatidz. Rekapitulasi ini sah dan dapat
            dipergunakan sebagai bahan pertimbangan evaluasi kedisiplinan dan pembinaan santri di lingkungan pesantren.
          </p>
        </div>

        {/* VI. Lembar Pengesahan Resmi 3 Kolom */}
        <div className="signature-section mt-6 pt-4 border-t border-black text-xs">
          <div className="text-right mb-4">
            Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-medium text-slate-700">Petugas Bagian Kebersihan,</p>
              <div className="h-16 flex items-end justify-center">
                <div className="border-b border-black w-36"></div>
              </div>
              <p className="font-bold text-slate-900 mt-1">Koordinator Kebersihan</p>
              <p className="text-[10px] text-slate-500">Unit Lingkungan Pesantren</p>
            </div>

            <div>
              <p className="font-medium text-slate-700">Bagian Kesantrian / Pengasuhan,</p>
              <div className="h-16 flex items-end justify-center">
                <div className="border-b border-black w-36"></div>
              </div>
              <p className="font-bold text-slate-900 mt-1">Ustadz Pembina Asrama</p>
              <p className="text-[10px] text-slate-500">Divisi Pengasuhan Santri</p>
            </div>

            <div>
              <p className="font-medium text-slate-700">Mengetahui & Menyetujui,</p>
              <div className="h-16 flex items-end justify-center">
                <div className="border-b border-black w-36"></div>
              </div>
              <p className="font-bold text-slate-900 mt-1">Kepala Bagian Administrasi</p>
              <p className="text-[10px] text-slate-500">Pimpinan Pesantren SIBERSIH</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
