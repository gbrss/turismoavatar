import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const categorias = {
  'city-tour': 'City tours',
  trekking: 'Trekking y naturaleza',
  nautico: 'Náuticas: SUP y kayak',
  aventura: 'Aventura',
  patrimonio: 'Patrimonio y cultura',
} as const;

const experiencias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experiencias' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(220),
    category: z.enum(Object.keys(categorias) as [keyof typeof categorias, ...(keyof typeof categorias)[]]),
    destinos: z.array(z.string()).min(1),
    duration: z.string(),
    difficulty: z.enum(['Baja', 'Media', 'Alta']).default('Baja'),
    // Si no hay precio publicado se muestra "Consultar" y el CTA va a WhatsApp / cotización.
    priceFrom: z.number().int().positive().optional(),
    priceUnit: z.enum(['persona', 'grupo']).default('persona'),
    minAge: z.number().int().optional(),
    groupSize: z.string().optional(),
    meetingPoint: z.string().optional(),
    schedule: z.string().optional(),
    includes: z.array(z.string()).default([]),
    bring: z.array(z.string()).default([]),
    itinerary: z.array(z.object({ title: z.string(), description: z.string() })).default([]),
    image: z.string(),
    gallery: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(100),
    seasons: z.array(z.string()).default(['Todo el año']),
  }),
});

const alojamientos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/alojamientos' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    destino: z.string(),
    location: z.string(),
    pricePerNight: z.number().int().positive(),
    capacity: z.number().int().positive(),
    beds: z.number().int().positive(),
    shared: z.boolean().default(false),
    amenities: z.array(z.string()).default([]),
    image: z.string(),
    gallery: z.array(z.string()).default([]),
    wpSlug: z.string(),
    order: z.number().default(100),
  }),
});

const programas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/programas' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    group: z.enum(['general', 'tercera-edad']).default('general'),
    days: z.number().int().positive(),
    nights: z.number().int().nonnegative().optional(),
    idealFor: z.string(),
    image: z.string().optional(),
    priceFrom: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
    experiencias: z.array(z.string()).default([]),
    plan: z.array(z.object({ day: z.number(), title: z.string(), items: z.array(z.string()) })).default([]),
    includes: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(100),
  }),
});

export const collections = { experiencias, alojamientos, programas };
