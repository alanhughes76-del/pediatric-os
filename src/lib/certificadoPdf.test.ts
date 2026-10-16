import type { Certificate } from '@/data/types';
import { htmlCertificado, nombreArchivo } from './certificadoPdf';
import { FIRMA, LEYENDA_DIGITAL } from './certificados';

const cert: Certificate = {
  id: 'c1', createdAt: '', createdBy: 'dr', patientId: 'p', type: 'aptitud-fisica',
  body: 'Certifico que Tomás <Ruiz>, de 3 años, se encuentra en buen estado de salud y apto para realizar actividad física escolar.',
  requestedBy: 'Lucía', destination: 'el colegio', place: 'Buenos Aires', date: '2026-10-16', signature: FIRMA, status: 'emitido', documentId: 'd1',
};

test('el PDF lleva marca, título, texto, lugar y fecha, firma y leyenda', () => {
  const html = htmlCertificado(cert);
  expect(html).toContain('Dr. Alan Hughes');
  expect(html).toContain('PEDIATRÍA A DOMICILIO');
  expect(html).toContain('Certificado de aptitud física');
  expect(html).toContain('Buenos Aires, 16 de octubre de 2026');
  expect(html).toContain(FIRMA);
  expect(html).toContain(LEYENDA_DIGITAL);
  expect(html).not.toContain('ANULADO');
});

test('escapa los caracteres especiales del texto', () => {
  expect(htmlCertificado(cert)).toContain('Tomás &lt;Ruiz&gt;');
});

test('un certificado anulado lleva el sello con el motivo', () => {
  const html = htmlCertificado({ ...cert, status: 'anulado', voidReason: 'error en el colegio' });
  expect(html).toContain('ANULADO · error en el colegio');
});

test('nombre de archivo sin tildes ni espacios', () => {
  expect(nombreArchivo(cert, 'Tomás Ruiz Ferreyra')).toBe('certificado-de-aptitud-fisica-tomas-ruiz-ferreyra-2026-10-16.pdf');
});
