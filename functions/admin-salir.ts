// Cierre de sesión cuando el panel usa contraseña de respaldo: responde 401 con el mismo reto para que el navegador olvide las credenciales.
export const onRequest: PagesFunction = async () =>
  new Response('Sesión cerrada', { status: 401, headers: { 'www-authenticate': 'Basic realm="Turismo Avatar admin", charset="UTF-8"', 'cache-control': 'no-store' } });
