'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Define the types based on the API response
interface CustomerInfo {
  name?: string;
  email?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  user?: {
    name?: string | null;
    email: string;
  };
  customerInfo?: CustomerInfo; // For guest orders
}

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/orders');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await response.json();
        setOrders(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const getCustomerName = (order: Order) => {
    if (order.user?.name) return order.user.name;
    if (order.customerInfo?.name) return `${order.customerInfo.name} (Guest)`;
    return 'N/A';
  };

  const getStatusVariant = (status: Order['status']) => {
    switch (status) {
      case 'PENDING': return 'secondary';
      case 'PROCESSING': return 'default';
      case 'SHIPPED': return 'default';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'destructive';
      case 'REFUNDED': return 'outline';
      default: return 'secondary';
    }
  };


  if (loading) {
    return <div>Cargando pedidos...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido #</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{getCustomerName(order)}</TableCell>
                <TableCell>${order.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(order.status)}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Ver Detalles</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
