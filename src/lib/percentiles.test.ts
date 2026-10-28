import {
  calcular, curva, elegirTabla, lmsEn, normalCDF, referenciaPorDefecto, tallaParaReferencia, posicionPorEdad, corteDeTalla,
  valorParaZ, zScore, avisoPara, imc, type Pedido,
} from './percentiles';
import { edadParaCalculo } from './edad';
import { filaDeCrecimiento } from './crecimiento';

const TOLERANCIA = 0.02;

function caso(pedido: Pedido, zEsperado: number, pEsperado: number) {
  const r = calcular(pedido);
  if (!r.ok) throw new Error(`Sin resultado: ${r.motivo}`);
  expect(Math.abs(r.z - zEsperado)).toBeLessThanOrEqual(TOLERANCIA);
  expect(Math.round(r.percentil)).toBe(pEsperado);
  return r;
}

describe('casos de referencia (tolerancia ±0,02 en Z)', () => {
  test('OMS peso/edad, varón, 12 meses, 10,5 kg → Z 0,78 (P78)', () => {
    const r = caso({ indicador: 'peso', sexo: 'M', valor: 10.5, meses: 12 }, 0.78, 78);
    expect(r.ok && r.referencia).toBe('OMS');
  });
  test('OMS talla/edad acostado, mujer, 6 meses, 62 cm → Z −1,65 (P5)', () => {
    const r = caso({ indicador: 'talla', sexo: 'F', valor: 62, meses: 6, posicion: 'acostado' }, -1.65, 5);
    expect(r.ok && r.etiqueta).toBe('OMS (acostado)');
  });
  test('OMS PC/edad, varón, 4 meses, 43,5 cm → Z 1,56 (P94)', () => {
    caso({ indicador: 'pc', sexo: 'M', valor: 43.5, meses: 4 }, 1.56, 94);
  });
  test('OMS IMC/edad, mujer, 60 meses, IMC 17,8 → Z 1,50 (P93)', () => {
    caso({ indicador: 'imc', sexo: 'F', valor: 17.8, meses: 60 }, 1.5, 93);
  });
  test('Argentina talla/edad, varón, 96 meses, 120 cm → Z −1,10 (P14)', () => {
    const r = caso({ indicador: 'talla', sexo: 'M', valor: 120, meses: 96 }, -1.1, 14);
    expect(r.ok && r.referencia).toBe('SAP');
  });
  test('Argentina peso/edad, mujer, 84 meses, 22,475 kg → Z 0,00 (P50)', () => {
    const r = caso({ indicador: 'peso', sexo: 'F', valor: 22.475, meses: 84 }, 0, 50);
    expect(r.ok && r.referencia).toBe('SAP');
  });
});

describe('fórmula LMS', () => {
  test('con L = 0 usa Z = ln(X/M) / S y la curva M·e^(S·Z)', () => {
    const fila = { t: 0, L: 0, M: 10, S: 0.1 };
    expect(zScore(10, fila)).toBe(0);
    expect(zScore(10 * Math.exp(0.1), fila)).toBeCloseTo(1, 10);
    expect(valorParaZ(1, fila)).toBeCloseTo(10 * Math.exp(0.1), 10);
  });
  test('la curva es la inversa del Z (L ≠ 0)', () => {
    const fila = { t: 0, L: -0.35, M: 9.6, S: 0.11 };
    expect(zScore(valorParaZ(1.2816, fila), fila)).toBeCloseTo(1.2816, 8);
  });
  test('interpola linealmente L, M y S entre los dos puntos más cercanos', () => {
    const filas = [{ t: 0, L: 1, M: 10, S: 0.1 }, { t: 2, L: 0, M: 20, S: 0.3 }];
    expect(lmsEn(filas, 1)).toEqual({ t: 1, L: 0.5, M: 15, S: 0.2 });
  });
  test('Φ(0) = 0,5 y Φ(1,8808) ≈ 0,97', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 7);
    expect(normalCDF(1.8808)).toBeCloseTo(0.97, 3);
  });
});

describe('fuera del rango de la referencia (no extrapola)', () => {
  test('PC después de los 60 meses', () => {
    expect(calcular({ indicador: 'pc', sexo: 'M', valor: 51, meses: 84 })).toEqual({ ok: false, motivo: 'fuera-de-rango' });
  });
  test('peso con OMS pedido explícitamente después de los 60 meses', () => {
    expect(calcular({ indicador: 'peso', sexo: 'F', valor: 22, meses: 84, referencia: 'OMS' })).toEqual({ ok: false, motivo: 'fuera-de-rango' });
  });
  test('peso/talla con una talla mayor a la tabla', () => {
    expect(calcular({ indicador: 'peso-talla', sexo: 'M', valor: 30, meses: 70, tallaCm: 130 })).toEqual({ ok: false, motivo: 'fuera-de-rango' });
  });
  test('las curvas no tienen puntos fuera de la tabla', () => {
    const p50 = curva('pc', 'F', 0, [0, 30, 60, 72, 96]);
    expect(p50.map((p) => p.x)).toEqual([0, 30, 60]);
  });
});

describe('referencias', () => {
  test('por defecto: OMS hasta 24 meses; peso y talla desde los 24, SAP (Garrahan); PC, IMC y peso/talla siempre OMS', () => {
    expect(referenciaPorDefecto('peso', 23.9)).toBe('OMS');
    expect(referenciaPorDefecto('peso', 24)).toBe('SAP');
    expect(referenciaPorDefecto('talla', 30)).toBe('SAP');
    expect(referenciaPorDefecto('talla', 120)).toBe('SAP');
    expect(referenciaPorDefecto('imc', 120)).toBe('OMS');
    expect(referenciaPorDefecto('pc', 12)).toBe('OMS');
    expect(referenciaPorDefecto('imc', 30)).toBe('OMS');
  });
  test('la referencia argentina se muestra como SAP/Lejarraga 2009 (Garrahan), con la posición en la talla', () => {
    expect(elegirTabla('peso', 'F', 30)?.etiqueta).toBe('SAP/Lejarraga 2009 (Garrahan)');
    expect(elegirTabla('talla', 'F', 30)?.etiqueta).toBe('SAP/Lejarraga 2009 (Garrahan), acostado');
    expect(elegirTabla('talla', 'F', 48)?.etiqueta).toBe('SAP/Lejarraga 2009 (Garrahan), de pie');
  });
  test('la planilla del Garrahan es la OMS acostado hasta los 2 años y sigue sin salto', () => {
    const oms = calcular({ indicador: 'talla', sexo: 'M', valor: 87, meses: 23.9, posicion: 'acostado' });
    const sap = calcular({ indicador: 'talla', sexo: 'M', valor: 87, meses: 24, posicion: 'acostado' });
    expect(oms.ok && sap.ok && Math.abs(oms.z - sap.z)).toBeLessThan(0.05);
  });
  test('se puede ver la otra referencia cuando existe', () => {
    const sap = calcular({ indicador: 'talla', sexo: 'M', valor: 75, meses: 12, referencia: 'SAP' });
    expect(sap.ok && sap.referencia).toBe('SAP');
    expect(elegirTabla('imc', 'M', 12, 'SAP')).toBeNull();
  });
});

describe('posición de la talla (corrección de 0,7 cm)', () => {
  test('se mide acostado antes de los 4 años y de pie desde los 4', () => {
    expect(posicionPorEdad(47.9)).toBe('acostado');
    expect(posicionPorEdad(48)).toBe('de_pie');
    expect(corteDeTalla('SAP')).toBe(48);
    expect(corteDeTalla('OMS')).toBe(24);
  });
  test('Garrahan: acostado hasta los 48 meses; de pie antes suma 0,7 y acostado desde los 48 resta 0,7', () => {
    expect(tallaParaReferencia(90, 'acostado', 30, 'SAP')).toBe(90);
    expect(tallaParaReferencia(90, undefined, 30, 'SAP')).toBe(90);
    expect(tallaParaReferencia(90, 'de_pie', 30, 'SAP')).toBeCloseTo(90.7, 10);
    expect(tallaParaReferencia(100, 'acostado', 50, 'SAP')).toBeCloseTo(99.3, 10);
    expect(tallaParaReferencia(100, undefined, 50, 'SAP')).toBe(100);
  });
  test('OMS: de pie antes de los 24 meses suma 0,7; acostado desde los 24 resta 0,7', () => {
    expect(tallaParaReferencia(80, 'de_pie', 18, 'OMS')).toBeCloseTo(80.7, 10);
    expect(tallaParaReferencia(90, 'acostado', 30, 'OMS')).toBeCloseTo(89.3, 10);
    expect(tallaParaReferencia(80, 'acostado', 18, 'OMS')).toBe(80);
    // Sin posición, a los 30 meses se supone acostado (se mide así hasta los 4 años).
    expect(tallaParaReferencia(90, undefined, 30, 'OMS')).toBeCloseTo(89.3, 10);
  });
  test('a los 30 meses, una talla acostado no se corrige contra el Garrahan y sí contra la OMS', () => {
    const sap = calcular({ indicador: 'talla', sexo: 'F', valor: 90, meses: 30, posicion: 'acostado' });
    const oms = calcular({ indicador: 'talla', sexo: 'F', valor: 90, meses: 30, posicion: 'acostado', referencia: 'OMS' });
    expect(sap.ok && sap.valorUsado).toBe(90);
    expect(oms.ok && oms.valorUsado).toBeCloseTo(89.3, 10);
  });
  test('el percentilo de una talla de pie a los 18 meses es el de la talla +0,7 acostado', () => {
    const dePie = calcular({ indicador: 'talla', sexo: 'F', valor: 80, meses: 18, posicion: 'de_pie' });
    const acostado = calcular({ indicador: 'talla', sexo: 'F', valor: 80.7, meses: 18, posicion: 'acostado' });
    expect(dePie.ok && acostado.ok && dePie.z).toBeCloseTo(acostado.ok ? acostado.z : NaN, 10);
  });
});

describe('avisos (criterios OMS)', () => {
  test('|Z| > 3 es valor extremo', () => {
    expect(avisoPara('peso', 3.2)).toBe('extremo');
    expect(avisoPara('peso', -3.2)).toBe('extremo');
    expect(avisoPara('peso', 2.9)).toBeUndefined();
  });
  test('fuera de los límites de plausibilidad es probable error de carga', () => {
    expect(avisoPara('peso', -6.1)).toBe('error-carga');
    expect(avisoPara('peso', 5.1)).toBe('error-carga');
    expect(avisoPara('talla', 5.5)).toBe('extremo');
    expect(avisoPara('talla', 6.1)).toBe('error-carga');
    expect(avisoPara('imc', -5.1)).toBe('error-carga');
    expect(avisoPara('peso-talla', 5.1)).toBe('error-carga');
  });
  test('un peso imposible (96 kg a los 12 meses) se marca como error de carga', () => {
    const r = calcular({ indicador: 'peso', sexo: 'M', valor: 96, meses: 12 });
    expect(r.ok && r.aviso).toBe('error-carga');
  });
});

describe('prematuros: edad corregida hasta los 24 meses', () => {
  const emma = { birthDate: '2026-01-20', gestationalWeeks: 34, gestationalDays: 3 };

  test('usa la edad corregida (34+3 semanas → 39 días menos)', () => {
    const e = edadParaCalculo(emma, '2026-09-22');
    expect(e.ok && e.corregida).toBe(true);
    expect(e.ok && e.meses).toBeCloseTo((245 - 39) / 30.4375, 6);
  });
  test('después de los 24 meses de edad cronológica usa la edad real', () => {
    const e = edadParaCalculo(emma, '2028-02-01');
    expect(e.ok && e.corregida).toBe(false);
  });
  test('antes del término no calcula', () => {
    expect(edadParaCalculo(emma, '2026-02-10')).toEqual({ ok: false, motivo: 'antes-del-termino' });
  });
  test('la fila de crecimiento queda marcada como corregida (punto hueco)', () => {
    const fila = filaDeCrecimiento(emma, 'F', { id: 'm', createdAt: '', createdBy: '', patientId: 'p', measuredAt: '2026-09-22', weightKg: 8, heightCm: 68 });
    expect(fila.corregida).toBe(true);
    expect(fila.peso?.resultado.ok).toBe(true);
    expect(fila.imc?.valor).toBeCloseTo(imc(8, 68), 10);
  });
  test('el IMC después de los 2 años usa la talla llevada a de pie (tabla OMS)', () => {
    const nene = { birthDate: '2024-01-01' };
    const fila = filaDeCrecimiento(nene, 'M', { id: 'm', createdAt: '', createdBy: '', patientId: 'p', measuredAt: '2026-07-01', weightKg: 13, heightCm: 90, position: 'acostado' });
    expect(fila.talla?.resultado.ok && fila.talla.resultado.valorUsado).toBe(90);
    expect(fila.imc?.valor).toBeCloseTo(imc(13, 89.3), 10);
  });
});
