import {
  esTipoEntrada, familiaPorTexto, fechasDeNacimiento, leerContacto, leerEstado, leerPagoTelegram, leerRespuestas, medidasDictadas,
} from '../../functions/src/entrada/leer';

describe('lo que entra desde Make', () => {
  test('tipos conocidos', () => {
    expect(esTipoEntrada('plaud.transcripcion')).toBe(true);
    expect(esTipoEntrada('otra.cosa')).toBe(false);
  });

  test('contacto: email válido y teléfono en E.164; lo inválido queda vacío', () => {
    expect(leerContacto({ nombre: ' Ana ', email: 'ANA@Ejemplo.com', telefono: '11 5555-0101' })).toEqual({ nombre: 'Ana', email: 'ana@ejemplo.com', telefono: '+5491155550101' });
    expect(leerContacto({ email: 'no-es-un-mail', telefono: 'abc' })).toEqual({ nombre: '', email: '', telefono: null });
  });

  test('respuestas de un formulario, como lista o como objeto', () => {
    expect(leerRespuestas([{ pregunta: '¿Edad?', respuesta: '2 años' }])).toEqual([{ pregunta: '¿Edad?', respuesta: '2 años' }]);
    expect(leerRespuestas({ Zona: 'Olivos' })).toEqual([{ pregunta: 'Zona', respuesta: 'Olivos' }]);
  });

  describe('pago por Telegram', () => {
    test('pesos con puntos, transferencia y apellido', () => {
      expect(leerPagoTelegram({ texto: 'pago 150.000 transferencia Ruiz' })).toEqual({ monto: 150000, moneda: null, medio: 'transferencia', resto: 'ruiz' });
    });
    test('dólares y efectivo', () => {
      expect(leerPagoTelegram({ texto: 'Pago USD 2000 efectivo Godoy membresía' })).toMatchObject({ monto: 2000, moneda: 'USD', medio: 'efectivo', resto: 'godoy membresia' });
    });
    test('signo $ y Mercado Pago', () => {
      expect(leerPagoTelegram({ texto: 'pago $90000 mp Sosa' })).toMatchObject({ monto: 90000, moneda: 'ARS', medio: 'mercadopago' });
    });
    test('sin monto: queda null (lo completa el Dr.)', () => {
      expect(leerPagoTelegram({ texto: 'pago Ruiz' }).monto).toBeNull();
    });
    test('si Make ya separó los datos, se usan', () => {
      expect(leerPagoTelegram({ texto: 'pago Ruiz', monto: 500, moneda: 'USD', medio: 'efectivo' })).toMatchObject({ monto: 500, moneda: 'USD', medio: 'efectivo' });
    });
    test('familia por apellido: solo si hay una sola', () => {
      const familias = [{ id: 'f1', name: 'Familia Ruiz Ferreyra' }, { id: 'f2', name: 'Familia Godoy' }, { id: 'f3', name: 'Familia Ruiz' }];
      expect(familiaPorTexto(familias, 'godoy')).toBe('f2');
      expect(familiaPorTexto(familias, 'ferreyra membresia')).toBe('f1');
      expect(familiaPorTexto(familias, 'ruiz')).toBeNull();
      expect(familiaPorTexto(familias, 'nadie')).toBeNull();
    });
  });

  describe('Plaud', () => {
    test('fecha de nacimiento dictada, numérica o con el mes en palabras', () => {
      expect(fechasDeNacimiento('Es Tomás, nació el 12/05/2023, viene por control.')).toEqual(['2023-05-12']);
      expect(fechasDeNacimiento('Fecha de nacimiento: 20 de enero de 2026.')).toEqual(['2026-01-20']);
      expect(fechasDeNacimiento('Control a los 31/02/2023 nació')).toEqual([]);
      expect(fechasDeNacimiento('Sin datos de nacimiento')).toEqual([]);
    });

    test('medidas dictadas, con unidades o sin ellas', () => {
      expect(medidasDictadas('Peso 12,5 kg, talla 88 cm y PC 47.')).toEqual({ weightKg: 12.5, heightCm: 88, headCm: 47 });
      expect(medidasDictadas('Pesa 7850 gramos, mide 0,68 metros, perímetro cefálico 43,5')).toEqual({ weightKg: 7.85, heightCm: 68, headCm: 43.5 });
      expect(medidasDictadas('Hablamos del sueño y la alimentación.')).toEqual({});
    });

    test('valores imposibles no se proponen', () => {
      expect(medidasDictadas('peso 900 kilos, talla 3000 cm, pc 5')).toEqual({});
    });
  });

  test('estado de entrega', () => {
    expect(leerEstado('delivered')).toBe('entregado');
    expect(leerEstado('Fallido')).toBe('fallido');
    expect(leerEstado('raro')).toBeNull();
  });
});
