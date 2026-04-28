import { NextResponse } from "next/server";
import { publicEnvStatus } from "@/lib/keeperhub";

export async function GET() {
  return NextResponse.json(publicEnvStatus());
}
