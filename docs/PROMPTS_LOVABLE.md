# Prompts para Lovable · Portal de familias (prototipo de diseño)

La app de Lovable es un **prototipo de diseño** del portal de familias. La historia clínica real es una sola y vive en Pediatric OS: lo que guste del prototipo se pasa después a Pediatric OS.

Pegar en Lovable **de a un bloque**, en este orden, y revisar la vista previa antes del siguiente.

---

## 1. Marca y correcciones

```
La app se llama "Dr. Alan Hughes - Pediatría Integral". La marca es el médico mismo: su nombre va en el ingreso, en el encabezado y en el título de la pestaña.

Usá la identidad de alanhughes.com.ar:
- Azules: #1B4D7E (títulos y acción principal), #2E6FA8 y #3C87BE (acciones e íconos), #6FB3DA (acentos), #E8F3FA y #F4F9FC (fondos y tarjetas), #22415A (texto).
- Sacá #C6ECF5 y #DEF5C6.
- Tipografía: Playfair Display en títulos y Source Sans 3 en el resto.
- Verificá contraste AA en todo texto y botón.

Es un servicio de pediatría a domicilio: nunca digas "consultorio" en los textos para familias.
Sacá la mención al "código de invitación": el acceso es por invitación del médico desde su panel.
No uses la palabra "premium".
```

## 2. Contacto: PacienteX, sin WhatsApp

```
Sacá toda referencia a WhatsApp, también la "estructura para sumar WhatsApp más adelante".
El contacto con el médico es un único botón verde (#1F7A4D) "Escribime por PacienteX" que abre
https://familias.somospacientex.com/familia/inv/PX-NXBMQZTA en el navegador, fuera de la app.
Va fijo en el Inicio y dentro de la pantalla de signos de alarma. Es la única excepción a la paleta azul.
Las notificaciones son dentro de la app y push (ver bloque 8).
```

## 3. Ingreso y adultos responsables

```
El ingreso principal es un enlace mágico por email ("Te mandamos un link para entrar"). Google queda como alternativa.
Reemplazá "padre y madre" por "adultos responsables": cada uno (madre, padre, abuela, tutor) tiene su propio acceso,
su relación con cada hijo y su domicilio. Un hijo puede tener dos domicilios.
El médico invita, habilita o quita cada acceso desde su panel.
Si la membresía no se renueva, la familia sigue entrando a ver y bajar su documentación, pero no puede pedir visitas.
```

## 4. Qué ve la familia de lo clínico

```
- Las alergias confirmadas se ven siempre, arriba en la tarjeta del hijo.
- Los problemas clínicos están ocultos por defecto: cada uno tiene un interruptor "Visible para la familia" que solo activa el médico.
- Nada clínico llega a la familia sin aprobación del médico: el resumen de cada visita queda "En revisión" hasta que él lo aprueba.
- Lo que carga la familia (antecedentes, estudios) muestra "Cargado por la familia · Sin revisar" hasta que el médico lo marca como revisado.
- Vacunas: mientras el médico no marque el calendario como verificado, la familia ve las aplicadas pero no las fechas estimadas.
  Las vacunas fuera de calendario van aparte, como "Recomendadas por tu pediatra".
```

## 5. Pedir una visita a domicilio

```
Cambiá "turno" por "visita". La familia elige:
- motivo,
- tipo: control o urgencia no crítica,
- domicilio (de los guardados),
- franja horaria preferida.

El domicilio tiene que estar en la zona: Vicente López, San Isidro, San Fernando, Tigre/Nordelta o CABA. Si no, la app avisa con amabilidad.
En urgencia no crítica se aclara que la respuesta es dentro de las 24 h y que, ante signos de alarma, hay que llamar al 107 (SAME) o ir a la guardia.
La familia solicita; nunca confirma. Estados: Solicitada, Confirmada (día y franja), En camino, Realizada, Reprogramada, Cancelada. Tope de 3 solicitudes abiertas.
Antes de la visita, una lista de qué tener a mano: libreta de vacunas, medicación que toma, estudios recientes.
```

## 6. Crecimiento, fiebre y urgencia

```
- Curvas de crecimiento SAP (Lejarraga 2009) y OMS (0–5 y 5–19 años), con edad gestacional corregida en prematuros hasta los 24 meses.
  Para la familia, en lenguaje simple ("Está creciendo dentro de lo esperado"), sin alarmar con percentilos crudos.
- Registro de fiebre: temperatura, fecha y hora, antitérmico de una lista (Paracetamol gotas o jarabe, Ibuprofeno al 2 % o al 4 %, Otro)
  y dosis en texto libre. La app nunca sugiere dosis ni diagnósticos.
- Pantalla "Signos de alarma" por edad, accesible desde cualquier pantalla y que funcione sin conexión, con "Llamá al 107" y el botón de PacienteX.
```

## 7. Membresía y documentos

```
- Tarjeta de membresía: vigencia, hijos incluidos, qué incluye (controles, urgencias con respuesta en menos de 24 h, coordinación con especialistas) y fecha de renovación.
- Pagos confirmados, solo lectura.
- Certificados (apto físico, escolar) para descargar en PDF.
- "Mis datos": cada adulto edita su teléfono, email y domicilios.
```

## 8. Diseño para padres con un bebé en brazos

```
- Uso con una mano: botones de 48 px o más, acción principal abajo, como mucho 3 toques para lo frecuente.
- Tarjeta por hijo con iniciales o foto y un color propio. "Próxima visita" destacada arriba en el Inicio.
- Estados vacíos cálidos que nombran al chico ("Todavía no hay estudios de Sofi"), estados de carga y errores en lenguaje humano.
- Instalable como app (PWA, "Agregar a pantalla de inicio"), con notificaciones push de visitas, vacunas y controles.
- Contenido útil por edad y época del hemisferio sur: bronquiolitis en otoño e invierno, golpe de calor y agua en verano, dengue.
```

## 9. Tono

```
Textos cálidos, en voseo rioplatense, nombrando al chico por su nombre. Nada corporativo.
Agradecé de forma explícita y cerrá los mensajes importantes con cariño. Por ejemplo, al confirmar una visita:
"¡Gracias, Laura! Nos vemos el jueves. Un abrazo para Sofi."
```

## 10. Es un prototipo

```
Es un prototipo de diseño: usá solo datos ficticios (los 5 pacientes de prueba y sus familias). Nunca datos reales de pacientes.
Mantené el selector para ver la interfaz del médico y la de la familia.
```
