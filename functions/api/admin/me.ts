import type { Env } from '../../../server/lib';
import { adminJson, type AdminUser } from '../../../server/admin';

export const onRequestGet: PagesFunction<Env, string, { user: AdminUser }> = async ({ env, data }) =>
  adminJson({
    email: data.user.email,
    via: data.user.via,
    servicios: { db: Boolean(env.DB), media: Boolean(env.MEDIA), github: Boolean(env.GITHUB_TOKEN), ai: Boolean(env.AI) },
  });
