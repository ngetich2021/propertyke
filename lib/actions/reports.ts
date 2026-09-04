"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireSection } from "@/lib/dal";
import { reportFormSchema, reportStatusFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";

export async function createReport(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = reportFormSchema.safeParse({
    listingId: formData.get("listingId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.report.create({
    data: {
      listingId: parsed.data.listingId,
      reporterId: user.id,
      reason: parsed.data.reason,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function resolveReport(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSection("reports");

  const parsed = reportStatusFormSchema.safeParse({
    reportId: formData.get("reportId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.report.update({
    where: { id: parsed.data.reportId },
    data: { status: parsed.data.status },
  });

  revalidatePath("/");
  return { success: true };
}

export async function getPendingReportCount() {
  return prisma.report.count({ where: { status: "OPEN" } });
}
