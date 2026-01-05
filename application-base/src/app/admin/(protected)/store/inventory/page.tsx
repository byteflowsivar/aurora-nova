import React from 'react';
import { InventoryList } from '@/modules/admin/components/inventory/inventory-list';

export default function StoreInventoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestión de Inventario</h1>
      <InventoryList />
    </div>
  );
}
