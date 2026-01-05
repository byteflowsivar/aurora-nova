import React from 'react';
import { OrderList } from '@/modules/admin/components/orders/order-list';

export default function StoreOrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestión de Pedidos</h1>
      <OrderList />
    </div>
  );
}
