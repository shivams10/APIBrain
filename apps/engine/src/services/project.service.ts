import { prisma } from "../lib/prisma";

export function createProject(userId: string, name: string) {
  return prisma.project.create({ data: { name, userId } });
}

export function listProjects(userId: string) {
  return prisma.project.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}
