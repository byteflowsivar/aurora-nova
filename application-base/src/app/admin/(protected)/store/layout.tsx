import React from 'react';

// Este layout envolverá las páginas de la sección de la tienda en el panel de administración.
// En el futuro, podría contener una barra de navegación secundaria para la tienda.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <div className="p-4">{children}</div>;
}
