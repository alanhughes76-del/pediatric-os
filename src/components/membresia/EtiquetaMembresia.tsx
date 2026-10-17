import type { EstadoMembresia } from '@/data/selectores';
import { Etiqueta } from '../Etiqueta';

const TONO = { activa: 'verde', 'por-vencer': 'naranja', vencida: 'alerta', suspendida: 'alerta', cancelada: 'neutro', 'sin-membresia': 'neutro' } as const;
const TEXTO: Record<EstadoMembresia, string> = {
  activa: 'Membresía activa', 'por-vencer': 'Membresía por renovar', vencida: 'Membresía vencida',
  suspendida: 'Membresía suspendida', cancelada: 'Membresía cancelada', 'sin-membresia': 'Sin membresía',
};

/** Estado de la membresía de una familia, con el color de siempre (rojo solo si hay que actuar). */
export function EtiquetaMembresia({ estado, ocultarSinMembresia = false }: { estado: EstadoMembresia; ocultarSinMembresia?: boolean }) {
  if (ocultarSinMembresia && estado === 'sin-membresia') return null;
  return <Etiqueta texto={TEXTO[estado]} tono={TONO[estado]} />;
}
