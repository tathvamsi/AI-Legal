import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("soli_session")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        Cookie: `soli_session=${token}`,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.session || null;
  } catch {
    return null;
  }
}

export async function getMatters() {
  const cookieStore = await cookies();
  const token = cookieStore.get("soli_session")?.value;
  if (!token) return [];

  try {
    const res = await fetch(`${BACKEND_URL}/api/matters`, {
      headers: {
        Cookie: `soli_session=${token}`,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.matters || [];
  } catch {
    return [];
  }
}

export async function getMatter(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("soli_session")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/matters/${id}`, {
      headers: {
        Cookie: `soli_session=${token}`,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.matter || null;
  } catch {
    return null;
  }
}

export async function getActs() {
  const cookieStore = await cookies();
  const token = cookieStore.get("soli_session")?.value;
  if (!token) return [];

  try {
    const res = await fetch(`${BACKEND_URL}/api/acts`, {
      headers: {
        Cookie: `soli_session=${token}`,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.acts || [];
  } catch {
    return [];
  }
}

export async function getAct(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("soli_session")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/acts/${id}`, {
      headers: {
        Cookie: `soli_session=${token}`,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.act || null;
  } catch {
    return null;
  }
}
