import { getServerApiBackendOrigin } from "@/app/lib/apiBackend";
import { NextResponse } from "next/server";

/** Public runtime config for the browser (Socket.IO needs the real API host). */
export async function GET() {
  const apiBaseUrl = getServerApiBackendOrigin();
  return NextResponse.json({ apiBaseUrl });
}
