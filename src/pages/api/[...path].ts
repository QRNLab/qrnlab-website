import type { APIContext } from 'astro';
import { app } from '../../api/app';

export const prerender = false;

export async function GET(context: APIContext) {
  return app.fetch(context.request);
}

export async function POST(context: APIContext) {
  return app.fetch(context.request);
}

export async function PUT(context: APIContext) {
  return app.fetch(context.request);
}

export async function PATCH(context: APIContext) {
  return app.fetch(context.request);
}

export async function DELETE(context: APIContext) {
  return app.fetch(context.request);
}

export async function OPTIONS(context: APIContext) {
  return app.fetch(context.request);
}
