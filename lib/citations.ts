import type { Answer, Source, ViewerContext } from "@/data/types";

export function canViewSource(source: Source, context: ViewerContext): boolean {
  if (source.workspaceId !== context.workspaceId) {
    return false;
  }

  if (source.visibility === "internal") {
    return context.role === "admin" && context.isInternalEmployee;
  }

  return true;
}

export function resolveVisibleSources(
  answer: Answer,
  allSources: Source[],
  context: ViewerContext
): Source[] {
  return answer.sourceIds
    .map((id) => allSources.find((source) => source.id === id))
    .filter((source): source is Source => source != null)
    .filter((source) => canViewSource(source, context));
}
