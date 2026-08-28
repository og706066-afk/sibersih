import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  AlertCircle,
  MapPin,
  TrendingDown,
  TrendingUp,
  History,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Textarea,
  LoadingState,
  EmptyState,
} from '../../components/common';

import { DataService } from '../../services/dataService';
import { useAuth } from '../../contexts/AuthContext';
import type { InventoryItem, InventoryLog } from '../../types';

export const InventoryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'logs'>('inventory');

  // Stock Adjustment Modal
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [actionType, setActionType] = useState<'use' | 'restock'>('use');
  const [quantity, setQuantity] = useState(1);
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [inv, lg] = await Promise.all([
        DataService.getInventories(),
        DataService.getInventoryLogs(),
      ]);
      setItems(inv);
      setLogs(lg);
    } catch (err) {
      console.error('Failed to load inventories', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdjust = (item: InventoryItem, action: 'use' | 'restock') => {
    setSelectedItem(item);
    setActionType(action);
    setQuantity(1);
    setActionNotes('');
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      const diff = actionType === 'restock' ? Math.abs(quantity) : -Math.abs(quantity);
      await DataService.updateInventoryStock(
        selectedItem.id,
        actionType,
        diff,
        currentUser?.uid || 'cleaner-1',
        currentUser?.displayName || 'Petugas Kebersihan',
        actionNotes
      );
      setSelectedItem(null);
      await loadData();
    } catch (err) {
      console.error('Failed to update stock', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Memuat data inventaris..." />;
  }

  const lowStockItems = items.filter((i) => i.stock <= i.minStockAlert);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900">Inventaris Alat & Bahan</h2>
        <p className="text-xs text-slate-500">Stok perlengkapan kebersihan pesantren</p>
      </div>

      {/* Low Stock Alert if any */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-900">
              Peringatan Stok Menipis! ({lowStockItems.length} barang)
            </span>
            <p className="text-amber-700 mt-0.5">
              {lowStockItems.map((i) => `${i.name} (sisa ${i.stock} ${i.unit})`).join(', ')}.
              Segera ajukan restock ke bagian sarpras.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-200/70 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'inventory'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Daftar Stok ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'logs'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Riwayat Mutasi ({logs.length})
        </button>
      </div>

      {/* Tab 1: Inventory List */}
      {activeTab === 'inventory' && (
        <div className="space-y-2.5">
          {items.map((item) => {
            const isLow = item.stock <= item.minStockAlert;
            return (
              <Card key={item.id} className="p-3.5 bg-white flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {item.category === 'tool'
                        ? 'Peralatan'
                        : item.category === 'chemical'
                        ? 'Bahan Kimia'
                        : 'Barang Habis Pakai'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">{item.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {item.location}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">
                      {item.stock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                    </div>
                    {isLow ? (
                      <Badge variant="warning" size="sm">
                        Stok Kritis
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        Aman
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    Batas aman: {item.minStockAlert} {item.unit}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenAdjust(item, 'use')}
                      className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" /> Pakai
                    </button>
                    <button
                      onClick={() => handleOpenAdjust(item, 'restock')}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Restock
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab 2: Mutasi Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <EmptyState
              icon={<History className="w-8 h-8" />}
              title="Belum Ada Riwayat Mutasi"
              description="Perubahan stok masuk atau pemakaian barang akan tercatat otomatis di sini."
            />
          ) : (
            logs.map((log) => {
              const isIncrease = log.quantityChanged > 0;
              return (
                <Card key={log.id} className="p-3 bg-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isIncrease ? (
                          <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center">
                            <TrendingDown className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <h4 className="text-xs font-bold text-slate-900">{log.inventoryName}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Oleh: {log.performedByName} • {log.notes || 'Tanpa catatan'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-bold ${
                          isIncrease ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isIncrease ? `+${log.quantityChanged}` : log.quantityChanged}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {log.previousStock} → {log.newStock}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Modal: Penyesuaian Stok */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={actionType === 'restock' ? 'Tambah Stok Barang' : 'Catat Pemakaian Barang'}
        description={selectedItem ? `${selectedItem.name} (Stok sekarang: ${selectedItem.stock} ${selectedItem.unit})` : ''}
      >
        <form onSubmit={handleConfirmAdjust} className="space-y-3.5">
          <Input
            type="number"
            min={1}
            max={actionType === 'use' ? selectedItem?.stock : undefined}
            label={`Jumlah ${actionType === 'restock' ? 'Ditambahkan' : 'Digunakan'} (${selectedItem?.unit})`}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            required
          />

          <Textarea
            label="Keterangan / Keperluan"
            placeholder={
              actionType === 'restock'
                ? 'Contoh: Pengadaan mingguan sarpras...'
                : 'Contoh: Didistribusikan ke piket Gedung Umar...'
            }
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
          />

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedItem(null)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant={actionType === 'restock' ? 'primary' : 'danger'}
              isLoading={isSubmitting}
            >
              Konfirmasi Perubahan Stok
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
