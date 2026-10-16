/**
 * Más pacientes de ejemplo (todos ficticios) para probar la lista con unos 40 pacientes.
 * Cada fila arma: paciente, familia, adulto principal, vínculo y domicilio.
 * Los hermanos comparten familia y adulto. Hay mellizas (mismo apellido y fecha de nacimiento).
 */
import type { Address, Family, Guardian, Patient, PatientRelationship, Scope, Sex } from './types';

const ALTA = '2026-06-01T10:00:00-03:00';
const MEDICO = 'dr';

type Fila = [nombre: string, apellido: string, nacimiento: string, sexo: Sex, ambito: Scope, adulto: string, relacion: 'madre' | 'padre', domicilio: string, localidad: string, semanas?: number];

const FILAS: Fila[] = [
  // Membresía
  ['Sofía', 'Martínez', '2022-03-14', 'F', 'membresia', 'Carla', 'madre', 'Av. Santa Fe 2840, 5.º A', 'Palermo, CABA'],
  ['Joaquín', 'Martínez', '2024-11-02', 'M', 'membresia', 'Carla', 'madre', 'Av. Santa Fe 2840, 5.º A', 'Palermo, CABA'],
  ['Mía', 'Fernández', '2025-08-19', 'F', 'membresia', 'Julián', 'padre', 'Roque Sáenz Peña 1200', 'Martínez'],
  ['Bautista', 'Gómez', '2020-12-05', 'M', 'membresia', 'Valeria', 'madre', 'Chacabuco 450', 'San Isidro'],
  ['Catalina', 'Núñez', '2026-02-27', 'F', 'membresia', 'Florencia', 'madre', 'Paraná 3300', 'Olivos', 35],
  ['Felipe', 'Ibáñez', '2023-07-30', 'M', 'membresia', 'Agustina', 'madre', 'Arenales 1820, 2.º C', 'Recoleta, CABA'],
  ['Renata', 'Suárez', '2021-10-11', 'F', 'membresia', 'Pablo', 'padre', 'Av. del Libertador 6500', 'Belgrano, CABA'],
  ['Lorenzo', 'Peña', '2025-04-22', 'M', 'membresia', 'Micaela', 'madre', 'Laprida 2100', 'Florida'],
  ['Isabella', 'Domínguez', '2019-06-08', 'F', 'membresia', 'Nicolás', 'padre', 'Gral. Paz 980', 'Vicente López'],
  // Cardales
  ['Paz', 'Acosta', '2023-09-15', 'F', 'cardales', 'Romina', 'madre', 'Los Ceibos 34, Barrio Los Cardales', 'Exaltación de la Cruz', 36],
  ['Juana', 'Acosta', '2023-09-15', 'F', 'cardales', 'Romina', 'madre', 'Los Ceibos 34, Barrio Los Cardales', 'Exaltación de la Cruz', 36],
  ['Tobías', 'Herrera', '2022-01-20', 'M', 'cardales', 'Lucas', 'padre', 'Las Acacias 210, Barrio Los Cardales', 'Exaltación de la Cruz'],
  ['Amparo', 'Molina', '2024-05-03', 'F', 'cardales', 'Daniela', 'madre', 'El Ombú 77, Barrio Los Cardales', 'Exaltación de la Cruz'],
  ['Santino', 'Ortiz', '2018-08-27', 'M', 'cardales', 'Gabriela', 'madre', 'Los Talas 15, Barrio Los Cardales', 'Exaltación de la Cruz'],
  ['Emilia', 'Rojas', '2025-12-01', 'F', 'cardales', 'Ezequiel', 'padre', 'Los Paraísos 98, Barrio Los Cardales', 'Exaltación de la Cruz'],
  ['Benicio', 'Rojas', '2021-03-17', 'M', 'cardales', 'Ezequiel', 'padre', 'Los Paraísos 98, Barrio Los Cardales', 'Exaltación de la Cruz'],
  ['Victoria', 'Castro', '2020-02-29', 'F', 'cardales', 'Mariana', 'madre', 'Las Tipas 41, Barrio Los Cardales', 'Exaltación de la Cruz'],
  // Hepta
  ['Ignacio', 'Ramírez', '2017-11-23', 'M', 'hepta', 'Soledad', 'madre', 'Av. Fondo de la Legua 2500', 'Boulogne'],
  ['Clara', 'Silva', '2024-01-09', 'F', 'hepta', 'Hernán', 'padre', 'Diego Carman 650', 'San Isidro'],
  ['Thiago', 'Torres', '2022-06-14', 'M', 'hepta', 'Lorena', 'madre', 'Juan B. Justo 1130', 'Beccar'],
  ['Josefina', 'Vega', '2019-09-30', 'F', 'hepta', 'Cecilia', 'madre', 'Alvear 280', 'Martínez'],
  ['Simón', 'Medina', '2025-10-18', 'M', 'hepta', 'Tomás', 'padre', 'Av. Sucre 2900', 'Beccar'],
  ['Alma', 'Cabrera', '2023-04-26', 'F', 'hepta', 'Paola', 'madre', 'Uruguay 3800', 'Victoria'],
  ['Mateo', 'Cabrera', '2020-07-07', 'M', 'hepta', 'Paola', 'madre', 'Uruguay 3800', 'Victoria'],
  // Esporádicos
  ['Lola', 'Aguirre', '2021-05-19', 'F', 'esporadico', 'Federico', 'padre', 'Billinghurst 1520, 9.º B', 'Palermo, CABA'],
  ['Valentín', 'Luna', '2016-12-12', 'M', 'esporadico', 'Natalia', 'madre', 'Cabildo 2400', 'Belgrano, CABA'],
  ['Olivia', 'Herrera Paz', '2024-09-05', 'F', 'esporadico', 'Inés', 'madre', 'Esmeralda 900', 'Retiro, CABA'],
  ['Máximo', 'Díaz', '2022-10-31', 'M', 'esporadico', 'Sebastián', 'padre', 'Maipú 3100', 'Olivos'],
  ['Martina', 'Ríos Blanco', '2018-03-03', 'F', 'esporadico', 'Verónica', 'madre', 'Pueyrredón 1850', 'Recoleta, CABA'],
  ['Dante', 'Sosa', '2025-07-15', 'M', 'esporadico', 'Camila', 'madre', 'Av. Cramer 2200', 'Belgrano, CABA'],
  // Sin asignar
  ['Elena', 'Giménez', '2026-08-20', 'F', 'sin-asignar', 'Rocío', 'madre', 'Avellaneda 500', 'San Fernando'],
  ['Gael', 'Pereyra Luna', '2023-12-24', 'M', 'sin-asignar', 'Martín', 'padre', 'Libertad 1400', 'Tigre'],
  ['Ema', 'Benítez Rocha', '2020-04-16', 'F', 'sin-asignar', 'Julia', 'madre', 'Cazón 870', 'Tigre'],
];

const clave = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');

export function pacientesExtra() {
  const families: Family[] = [];
  const guardians: Guardian[] = [];
  const addresses: Address[] = [];
  const patients: Patient[] = [];
  const relationships: PatientRelationship[] = [];

  FILAS.forEach(([nombre, apellido, nacimiento, sexo, ambito, adulto, relacion, calle, localidad, semanas], i) => {
    const fam = `f-x-${clave(apellido)}-${clave(adulto)}`;
    const gua = `g-x-${clave(adulto)}-${clave(apellido)}`;
    if (!families.some((f) => f.id === fam)) {
      families.push({ id: fam, createdAt: ALTA, createdBy: MEDICO, name: `Familia ${apellido}` });
      guardians.push({
        id: gua, createdAt: ALTA, createdBy: MEDICO, familyId: fam,
        firstName: adulto, lastName: apellido, email: `${clave(adulto)}.${clave(apellido)}@ejemplo.com`,
        phone: `11 5555-${String(1000 + i).padStart(4, '0')}`, accessEnabled: ambito === 'membresia',
      });
      addresses.push({ id: `ad-x-${clave(adulto)}-${clave(apellido)}`, createdAt: ALTA, createdBy: MEDICO, guardianId: gua, street: calle, locality: localidad });
    }
    const id = `p-x-${i}`;
    patients.push({
      id, createdAt: ALTA, createdBy: MEDICO, familyId: fam, firstName: nombre, lastName: apellido,
      birthDate: nacimiento, sex: sexo, gestationalWeeks: semanas, scope: ambito, status: 'activo',
    });
    relationships.push({ id: `r-x-${i}`, createdAt: ALTA, createdBy: MEDICO, patientId: id, guardianId: gua, type: relacion, isPrimary: true, validFrom: '2026-06-01' });
  });

  return { families, guardians, addresses, patients, relationships };
}
