import { CartProvider } from "@/modules/public/contexts/cart-context";
import React from "react";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <CartProvider>
            {children}
        </CartProvider>
    );
}
