"use client";

import React from "react";
import CatalogoCategoriasTaller, {
  CATEGORIAS_TALLER_MAESTRAS,
} from "./CatalogoCategoriasTaller";

export interface ModalCategoriasTallerProps {
  isOpen: boolean;
  onClose: () => void;
  serviciosDb?: any[];
  ordenActiva?: any;
  onAgregarServicioAOrden?: (item: any) => void;
  onEliminarServicioDeOrden?: (codigoOId: string) => void;
  mostrarToast?: (msg: string, tipo?: "ok" | "err" | "info") => void;
}

export { CATEGORIAS_TALLER_MAESTRAS };

export default function ModalCategoriasTaller({
  isOpen,
  onClose,
  serviciosDb = [],
  ordenActiva,
  onAgregarServicioAOrden,
  onEliminarServicioDeOrden,
  mostrarToast,
}: ModalCategoriasTallerProps) {
  if (!isOpen) return null;

  return (
    <CatalogoCategoriasTaller
      isModal={true}
      onCloseModal={onClose}
      serviciosDb={serviciosDb}
      ordenActiva={ordenActiva}
      onAgregarServicioAOrden={onAgregarServicioAOrden}
      onEliminarServicioDeOrden={onEliminarServicioDeOrden}
      mostrarToast={mostrarToast}
    />
  );
}
