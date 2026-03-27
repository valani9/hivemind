import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function err(code: string, message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status }
  );
}

export function unauthorized(message = "Unauthorized") {
  return err("UNAUTHORIZED", message, 401);
}

export function notFound(message = "Not found") {
  return err("NOT_FOUND", message, 404);
}
