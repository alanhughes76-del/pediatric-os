# shared/

Lógica pura (sin interfaz ni Firebase) que usan **la app y las Cloud Functions**. Así una regla de negocio vive en un solo lugar: por ejemplo, el control de duplicados corre igual en la pantalla de alta y en el servidor.

- En la app se importa con `@shared/…`.
- En las Functions se importa con una ruta relativa (`../../shared/…`). Se compila junto con ellas en `functions/lib/`.
- Los tests van al lado de cada archivo (`*.test.ts`) y corren con `npm test`.
