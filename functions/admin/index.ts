export const onRequestGet: PagesFunction = async ({ request }) => Response.redirect(new URL('/admin/reservas', request.url).toString(), 302);
