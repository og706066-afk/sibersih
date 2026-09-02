import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  User,
  Clock,
  Ban,
  CheckCircle2,
  AlertCircle,
  FileText,
  Camera,
  MapPin,
} from 'lucide-react';

import {
  Card,
  Badge,
  Modal,
  Input,
  LoadingState,
  EmptyState,
} from '../../components/common';
import { DataService } from '../../services/dataService';
import type { Penalty, Violation } from '../../types';

export const AdminPenaltiesPage: React.FC = () => {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null);

  const loadData = async () => {
    try {
      const [penData, violData] = await Promise.all([
        DataService.getPenalties(),
        DataService.getViolations(),
      ]);
      setPenalties(penData);
      setViolations(violData);
    } catch (err) {
      console.error('Failed to load penalties or violations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (isLoading) {
    return <LoadingState message="Memuat rekapan denda & kas kebersihan..." />;
  }

  // Summary Metrics Calculation
  const pendingPenalties = penalties.filter((p) => (p.status || 'pending') === 'pending');
  const paidPenalties = penalties.filter((p) => p.status === 'paid');
  const cancelledPenalties = penalties.filter((p) => p.status === 'cancelled');

  const totalPendingAmount = pendingPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaidAmount = paidPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCancelledAmount = cancelledPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Filter and Search Logic
  const filteredPenalties = penalties.filter((p) => {
    const penaltyStatus = p.status || 'pending';
    const matchesStatus = filterStatus === 'all' || penaltyStatus === filterStatus;
    const query = searchQuery.toLowerCase().trim();

    if (!query) return matchesStatus;

    const matchesSearch =
      (p.className || '').toLowerCase().includes(query) ||
      (p.responsiblePerson || '').toLowerCase().includes(query) ||
      (p.reason || '').toLowerCase().includes(query) ||
      (p.receiptNumber || '').toLowerCase().includes(query) ||
      (p.issuedByName || '').toLowerCase().includes(query) ||
      (p.paidReceivedById || '').toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  // Helper for Status Badge
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" size="sm">Lunas</Badge>;
      case 'cancelled':
        return <Badge variant="neutral" size="sm">Dibatalkan</Badge>;
      case 'waived':
        return <Badge variant="info" size="sm">Dibebaskan</Badge>;
      case 'pending':
      default:
        return <Badge variant="warning" size="sm">Belum Lunas</Badge>;
    }
  };

  // Find related violation for modal
  const selectedViolation = selectedPenalty?.violationId
    ? violations.find((v) => v.id === selectedPenalty.violationId)
    : undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900">Monitoring Denda & Kas</h2>
        <p className="text-xs text-slate-500">
          Pantauan transaksi denda, status pelunasan, dan rekap kas kebersihan
        </p>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Belum Lunas */}
        <Card className="p-3 bg-white border-amber-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Belum Lunas</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-sm font-bold text-amber-700">
              Rp {totalPendingAmount.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {pendingPenalties.length} tagihan tertunda
            </div>
          </div>
        </Card>

        {/* Sudah Lunas */}
        <Card className="p-3 bg-white border-emerald-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Sudah Lunas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-sm font-bold text-emerald-700">
              Rp {totalPaidAmount.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {paidPenalties.length} kas diterima
            </div>
          </div>
        </Card>

        {/* Dibatalkan */}
        <Card className="p-3 bg-white border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Dibatalkan</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-sm font-bold text-slate-700">
              Rp {totalCancelledAmount.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {cancelledPenalties.length} denda dibatalkan
            </div>
          </div>
        </Card>

        {/* Total Transaksi */}
        <Card className="p-3 bg-white border-indigo-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Denda</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-sm font-bold text-indigo-900">
              {penalties.length} Tagihan
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Seluruh riwayat
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua ({penalties.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Belum Lunas ({pendingPenalties.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterStatus === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Lunas ({paidPenalties.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('cancelled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterStatus === 'cancelled'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Dibatalkan ({cancelledPenalties.length})
          </button>
        </div>

        <Input
          placeholder="Cari kelas, penanggung jawab, kuitansi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </div>

      {/* Penalty Cards List */}
      {filteredPenalties.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-slate-400" />}
          title="Tidak Ada Data Denda"
          description={
            searchQuery
              ? 'Tidak ditemukan tagihan denda yang cocok dengan pencarian Anda.'
              : 'Belum ada data denda kebersihan yang tercatat pada filter ini.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filteredPenalties.map((penalty) => {
            const status = penalty.status || 'pending';
            const isPaid = status === 'paid';
            const isCancelled = status === 'cancelled';

            return (
              <Card
                key={penalty.id}
                hoverEffect
                onClick={() => setSelectedPenalty(penalty)}
                className="p-3.5 bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{penalty.className || 'Area Lingkungan'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{penalty.responsiblePerson || 'Petugas Piket'}</span>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2 flex flex-col items-end">
                      <span
                        className={`text-sm font-bold ${
                          isCancelled
                            ? 'text-slate-400 line-through'
                            : isPaid
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        Rp {penalty.amount.toLocaleString('id-ID')}
                      </span>
                      <div className="mt-1">{getStatusBadge(status)}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                    {penalty.reason}
                  </p>

                  {/* Payment Details Pill if Paid */}
                  {isPaid && (
                    <div className="text-xs bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/80 mt-2 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Lunas (No: {penalty.receiptNumber || '-'})</span>
                        </span>
                        <span>{penalty.paidAt ? new Date(penalty.paidAt).toLocaleDateString('id-ID') : '-'}</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 truncate">
                        Penerima: {penalty.paidReceivedById || 'Petugas Kebersihan'}
                      </p>
                    </div>
                  )}

                  {/* Cancellation Details Pill if Cancelled */}
                  {isCancelled && (
                    <div className="text-xs bg-rose-50/70 p-2 rounded-lg border border-rose-200/80 mt-2 space-y-0.5">
                      <div className="flex items-center gap-1 font-semibold text-rose-800 text-[11px]">
                        <Ban className="w-3 h-3 text-rose-600" />
                        <span>Dibatalkan: {penalty.cancellationReason || 'Tanpa alasan'}</span>
                      </div>
                      <p className="text-[11px] text-rose-600">
                        Oleh: {penalty.cancelledByName || '-'} • {penalty.cancelledAt ? new Date(penalty.cancelledAt).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Terbit: {penalty.issuedDate || '-'}
                  </span>
                  <span className="text-slate-500 font-medium truncate max-w-[140px]">
                    Oleh: {penalty.issuedByName || 'Petugas'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Rincian Lengkap Denda & Audit Trail */}
      <Modal
        isOpen={Boolean(selectedPenalty)}
        onClose={() => setSelectedPenalty(null)}
        title="Rincian Transaksi Denda"
        description={`ID: ${selectedPenalty?.id || ''}`}
        size="lg"
      >
        {selectedPenalty && (
          <div className="space-y-4">
            {/* Header Box Status & Nominal */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Nominal Sanksi</span>
                <div
                  className={`text-xl font-bold mt-0.5 ${
                    selectedPenalty.status === 'cancelled'
                      ? 'text-slate-400 line-through'
                      : selectedPenalty.status === 'paid'
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  Rp {selectedPenalty.amount.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium block mb-1">Status Kas</span>
                {getStatusBadge(selectedPenalty.status)}
              </div>
            </div>

            {/* Section 1: Informasi Denda */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Informasi Denda
              </h4>
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Kelas / Area:</span>
                  <span className="font-bold text-slate-900">{selectedPenalty.className || 'Area Lingkungan'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Penanggung Jawab:</span>
                  <span className="font-semibold text-slate-800">{selectedPenalty.responsiblePerson || 'Petugas Piket'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Petugas Penerbit:</span>
                  <span className="font-medium text-slate-700">{selectedPenalty.issuedByName || 'Petugas Kebersihan'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Tanggal Diterbitkan:</span>
                  <span className="font-medium text-slate-700">{selectedPenalty.issuedDate || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Alasan Pelanggaran:</span>
                  <p className="p-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                    {selectedPenalty.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Informasi Pembayaran */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                Informasi Pembayaran
              </h4>
              {selectedPenalty.status === 'paid' ? (
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                    <span className="text-emerald-800 font-medium">Status:</span>
                    <Badge variant="success" size="sm">Lunas</Badge>
                  </div>
                  <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                    <span className="text-emerald-800 font-medium">Nomor Kuitansi:</span>
                    <span className="font-mono font-bold text-emerald-900">{selectedPenalty.receiptNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                    <span className="text-emerald-800 font-medium">Waktu Pembayaran:</span>
                    <span className="font-semibold text-emerald-900">
                      {selectedPenalty.paidAt ? new Date(selectedPenalty.paidAt).toLocaleString('id-ID') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-800 font-medium">Petugas Penerima:</span>
                    <span className="font-bold text-emerald-900">{selectedPenalty.paidReceivedById || 'Petugas Kebersihan'}</span>
                  </div>
                </div>
              ) : selectedPenalty.status === 'cancelled' ? (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500">
                  Tagihan telah dibatalkan, tidak ada catatan penerimaan kas.
                </div>
              ) : (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Denda ini belum dilunasi oleh pihak santri/wali kelas terkait.</span>
                </div>
              )}
            </div>

            {/* Section 3: Informasi Pembatalan (Jika Cancelled) */}
            {selectedPenalty.status === 'cancelled' && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  Informasi Pembatalan
                </h4>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 space-y-2 text-xs text-rose-900">
                  <div className="flex justify-between border-b border-rose-200/60 pb-1.5">
                    <span className="text-rose-700">Dibatalkan Oleh:</span>
                    <span className="font-bold">{selectedPenalty.cancelledByName || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-rose-200/60 pb-1.5">
                    <span className="text-rose-700">Waktu Pembatalan:</span>
                    <span className="font-semibold">
                      {selectedPenalty.cancelledAt ? new Date(selectedPenalty.cancelledAt).toLocaleString('id-ID') : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-rose-700 block mb-1">Alasan Pembatalan:</span>
                    <p className="p-2 bg-white/80 rounded-lg border border-rose-200 text-rose-800">
                      {selectedPenalty.cancellationReason || 'Tanpa keterangan tambahan'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Pelanggaran Terkait & Foto Bukti */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                Bukti & Data Pelanggaran Induk
              </h4>
              {selectedViolation ? (
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Jenis Pelanggaran:</span>
                    <span className="font-bold text-slate-900">{selectedViolation.violationTypeName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Pelapor:</span>
                    <span className="font-medium text-slate-800">{selectedViolation.reportedByName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Keterangan / Temuan:</span>
                    <p className="p-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                      {selectedViolation.description}
                    </p>
                  </div>

                  {selectedViolation.photoUrls && selectedViolation.photoUrls.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-slate-500 block font-medium">Foto Bukti Pelanggaran:</span>
                      <div className="rounded-xl overflow-hidden border border-slate-200 max-h-52 bg-black flex items-center justify-center">
                        <img
                          src={selectedViolation.photoUrls[0]}
                          alt="Bukti Pelanggaran"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500">
                  Data detail pelanggaran induk tidak ditemukan (atau telah diarsipkan).
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
