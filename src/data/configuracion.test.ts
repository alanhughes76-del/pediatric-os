import { aNumero, armarAgenda, conLinks, conPrecios, dinero, precioMembresia, PRECIOS_INICIALES, renovacionSugerida, validarLink } from './configuracion';
import { CONFIG_AGENDA_INICIAL, TIPOS_TURNO } from '@shared/agenda';

describe('configuración', () => {
  test('membresía anual: hijos adicionales con el descuento configurado', () => {
    expect(precioMembresia(PRECIOS_INICIALES, 'anual', 1).monto).toBe(2000);
    expect(precioMembresia(PRECIOS_INICIALES, 'anual', 2).monto).toBe(3000);
    expect(precioMembresia(PRECIOS_INICIALES, 'anual', 3).monto).toBe(4000);
    expect(precioMembresia(PRECIOS_INICIALES, 'anual', 0).monto).toBe(2000);
  });

  test('membresía semestral: el precio cargado, sin descuento inventado', () => {
    expect(precioMembresia(PRECIOS_INICIALES, 'semestral', 3)).toMatchObject({ monto: 1000, moneda: 'USD' });
  });

  test('usa lo que cargó el Dr.', () => {
    const precios = conPrecios({ membresia: { ...PRECIOS_INICIALES.membresia, anual: 2400, descuentoHijoAdicionalPct: 25 } });
    expect(precioMembresia(precios, 'anual', 2).monto).toBe(4200);
    expect(precios.visitas.controlOUrgenciaDia).toBe(150000);
  });

  test('renovación: un año o seis meses; fin de mes', () => {
    expect(renovacionSugerida('2026-03-01', 'anual')).toBe('2027-03-01');
    expect(renovacionSugerida('2026-03-01', 'semestral')).toBe('2026-09-01');
    expect(renovacionSugerida('2026-08-31', 'semestral')).toBe('2027-02-28');
  });

  test('links y montos', () => {
    expect(conLinks({ calControlUrl: 'https://cal.com/x' }).calControlUrl).toBe('https://cal.com/x');
    expect(conLinks(undefined).pacienteXUrl).toMatch(/^https:/);
    expect(validarLink('')).toBeUndefined();
    expect(validarLink('http://x')).toBeTruthy();
    expect(dinero(150000, 'ARS')).toBe('$ 150.000');
    expect(dinero(2000, 'USD')).toBe('USD 2.000');
  });

  test('montos escritos a la argentina', () => {
    expect(aNumero('150.000')).toBe(150000);
    expect(aNumero('2000')).toBe(2000);
    expect(aNumero('12,5')).toBe(12.5);
    expect(aNumero('')).toBeNaN();
    expect(aNumero('mil')).toBeNaN();
  });

  describe('agenda', () => {
    const duraciones = Object.fromEntries(TIPOS_TURNO.map((t) => [t, String(CONFIG_AGENDA_INICIAL.duracionMin[t])])) as Record<(typeof TIPOS_TURNO)[number], string>;
    const base = { horarios: CONFIG_AGENDA_INICIAL.horarios, duraciones, buffer: '30', zonas: [{ nombre: 'CABA', localidades: 'Palermo, Belgrano' }] };

    test('arma la configuración', () => {
      const r = armarAgenda(base);
      expect(typeof r).toBe('object');
      if (typeof r === 'string') return;
      expect(r.bufferMin).toBe(30);
      expect(r.zonas).toEqual([{ nombre: 'CABA', localidades: ['Palermo', 'Belgrano'] }]);
      expect(r.horarios[0]).toEqual([]);
    });

    test('rechaza horarios, duraciones, buffer o zonas mal cargados', () => {
      expect(armarAgenda({ ...base, horarios: { ...base.horarios, 1: [{ desde: '9', hasta: '13:00' }] } })).toMatch(/Lunes/);
      expect(armarAgenda({ ...base, horarios: { ...base.horarios, 2: [{ desde: '14:00', hasta: '13:00' }] } })).toMatch(/Martes/);
      expect(armarAgenda({ ...base, duraciones: { ...duraciones, control: '0' } })).toMatch(/duración/);
      expect(armarAgenda({ ...base, buffer: 'x' })).toMatch(/buffer/);
      expect(armarAgenda({ ...base, zonas: [{ nombre: '', localidades: 'Olivos' }] })).toMatch(/nombre/);
    });
  });
});
