import { datosDeEjemplo } from './mock';
import { avisosDelMedico } from './avisos';
import { fiebreDe, seguimientosPendientes, sinRevisar, membresiaDeFamilia } from './selectores';

describe('avisos del médico', () => {
  const ahora = new Date().toISOString();
  const avisos = avisosDelMedico(datosDeEjemplo, ahora);

  test('cada seguimiento vencido es un aviso en rojo', () => {
    const vencidos = seguimientosPendientes(datosDeEjemplo).filter((f) => f.dueAt < ahora);
    const deSeguimiento = avisos.filter((a) => a.tipo === 'seguimiento');
    expect(deSeguimiento).toHaveLength(vencidos.length);
    expect(deSeguimiento.every((a) => a.alerta)).toBe(true);
  });

  test('hay un aviso de fiebre por cada chico con registros sin revisar', () => {
    const conFiebre = datosDeEjemplo.patients.filter((p) => fiebreDe(datosDeEjemplo, p.id).some(sinRevisar));
    expect(avisos.filter((a) => a.tipo === 'fiebre').map((a) => a.href)).toEqual(conFiebre.map((p) => `/medico/fiebre/${p.id}`));
  });

  test('las membresías vencidas o por renovar avisan; las activas no', () => {
    const esperadas = datosDeEjemplo.families.filter((f) => ['vencida', 'por-vencer'].includes(membresiaDeFamilia(datosDeEjemplo, f.id).estado));
    expect(avisos.filter((a) => a.tipo === 'membresia')).toHaveLength(esperadas.length);
  });

  test('sin datos, no hay avisos', () => {
    expect(avisosDelMedico({ ...datosDeEjemplo, followUps: [], fever: [], memberships: [], studies: [], vaccineDoses: [] }, ahora)).toEqual([]);
  });

  test('resultado de estudio sin revisar y vacunas atrasadas', () => {
    const avisos = avisosDelMedico(datosDeEjemplo, ahora);
    expect(avisos.filter((a) => a.tipo === 'estudio').map((a) => a.titulo)).toEqual(['Resultado para revisar · Mateo Sosa']);
    const vac = avisos.filter((a) => a.tipo === 'vacuna');
    expect(vac.map((a) => a.titulo).sort()).toEqual(['Vacunas atrasadas · Emma Ruiz Ferreyra', 'Vacunas atrasadas · Tomás Ruiz Ferreyra']);
    expect(vac.every((a) => a.detalle.includes('calendario sin verificar'))).toBe(true);
  });
});
