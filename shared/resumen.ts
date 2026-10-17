/**
 * Mail con el resumen para la familia (prompt maestro 7.5): lo arma la app con el "Resumen para
 * la familia" de una nota APROBADA y nada más (ni hallazgos ni conducta). El Dr. lo revisa, lo
 * puede cambiar y recién ahí lo manda ("Revisé y lo mando"). El envío lo hace Make.
 */
export function mailDelResumen(p: { nombresAdultos: string[]; nombreChico: string; fecha: string; resumen: string }) {
  const n = p.nombresAdultos.filter(Boolean);
  const saludo = n.length === 0 ? 'Hola.' : `Hola, ${n.length === 1 ? n[0] : `${n.slice(0, -1).join(', ')} y ${n.at(-1)}`}.`;
  return {
    asunto: `Resumen de la consulta de ${p.nombreChico}`,
    texto: [
      saludo,
      `Te dejo el resumen de la consulta de ${p.nombreChico} del ${p.fecha}:`,
      p.resumen.trim(),
      'Cualquier duda, escribime por PacienteX. Ante una urgencia, andá a la guardia o llamá al SAME (107).',
      'Dr. Alan Hughes',
    ].join('\n\n'),
  };
}
