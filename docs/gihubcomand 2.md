Sí, ese flujo es correcto y seguro para tu caso. Resumiendo:

```bash
git status
git add -A
git commit -m "XXXX"
git push origin feature/locale-persistence
git status
```

Comentarios rápidos:

- `git status`  
  - Antes: ves qué vas a commitear.  
  - Después: confirmas que quedó `working tree clean`.

- `git add -A`  
  - Incluye TODO: nuevos, modificados y borrados.

- `git commit -m "XXXX"`  
  - Si no hay cambios staged, no hace nada (te avisa).

- `git push origin feature/locale-persistence`  
  - Sube todos los commits nuevos de esa rama al remoto.

Mientras trabajes siempre en `feature/locale-persistence`, ese patrón te deja la rama remota exactamente igual que tu máquina, ideal para seguir en otra computadora.