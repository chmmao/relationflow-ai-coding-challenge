import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { CitationList } from "@/components/citation-list";
import { conversations, sources, viewer } from "@/data/fixtures";
import { canViewSource, resolveVisibleSources } from "@/lib/citations";
import type { Answer, Source, ViewerContext } from "@/data/types";

// ---------------------------------------------------------------------------
// Component tests (provided by the challenge)
// ---------------------------------------------------------------------------

describe("CitationList", () => {
  it("shows linked sources for an answer", () => {
    render(<CitationList answer={conversations[0].answer} sources={sources} viewer={viewer} />);

    expect(screen.getByText("Acme Onboarding Playbook")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-citations")).not.toBeInTheDocument();
  });

  it("does not crash when an answer references a deleted source", () => {
    render(<CitationList answer={conversations[1].answer} sources={sources} viewer={viewer} />);

    expect(screen.getByTestId("empty-citations")).toHaveTextContent("No sources available");
  });

  it("shows the empty state when no sources are attached", () => {
    render(<CitationList answer={conversations[2].answer} sources={sources} viewer={viewer} />);

    expect(screen.getByTestId("empty-citations")).toHaveTextContent("No sources available");
  });
});

// ---------------------------------------------------------------------------
// Resolver unit tests
// ---------------------------------------------------------------------------

describe("canViewSource", () => {
  const acmeMember: ViewerContext = {
    userId: "u1",
    displayName: "Test",
    workspaceId: "acme",
    role: "member",
    isInternalEmployee: false,
  };

  const acmeAdmin: ViewerContext = {
    ...acmeMember,
    role: "admin",
    isInternalEmployee: true,
  };

  const acmeWorkspaceSource: Source = {
    id: "s1",
    title: "Acme Doc",
    excerpt: "",
    workspaceId: "acme",
    visibility: "workspace",
    ownerTeam: "Eng",
    updatedAt: "2026-01-01",
  };

  const acmeInternalSource: Source = {
    ...acmeWorkspaceSource,
    id: "s2",
    visibility: "internal",
  };

  const globexSource: Source = {
    ...acmeWorkspaceSource,
    id: "s3",
    workspaceId: "globex",
  };

  it("allows a member to see a workspace-visible source in their workspace", () => {
    expect(canViewSource(acmeWorkspaceSource, acmeMember)).toBe(true);
  });

  it("blocks a member from seeing an internal source", () => {
    expect(canViewSource(acmeInternalSource, acmeMember)).toBe(false);
  });

  it("blocks access to sources from a different workspace", () => {
    expect(canViewSource(globexSource, acmeMember)).toBe(false);
  });

  it("allows an internal admin to see internal sources", () => {
    expect(canViewSource(acmeInternalSource, acmeAdmin)).toBe(true);
  });
});

describe("resolveVisibleSources", () => {
  it("filters out cross-workspace sources even when referenced by sourceIds", () => {
    const result = resolveVisibleSources(conversations[0].answer, sources, viewer);

    const ids = result.map((s) => s.id);
    expect(ids).toContain("src_acme_onboarding");
    expect(ids).not.toContain("src_globex_onboarding");
  });

  it("filters out internal sources for non-admin viewers", () => {
    const result = resolveVisibleSources(conversations[0].answer, sources, viewer);

    const ids = result.map((s) => s.id);
    expect(ids).not.toContain("src_acme_internal_comp");
  });

  it("gracefully handles sourceIds that reference non-existent sources", () => {
    const answer: Answer = { id: "a1", body: "test", sourceIds: ["src_does_not_exist"] };
    const result = resolveVisibleSources(answer, sources, viewer);

    expect(result).toEqual([]);
  });

  it("returns an empty array when sourceIds is empty", () => {
    const answer: Answer = { id: "a1", body: "test", sourceIds: [] };
    const result = resolveVisibleSources(answer, sources, viewer);

    expect(result).toEqual([]);
  });

  it("preserves the order of sourceIds", () => {
    const answer: Answer = {
      id: "a1",
      body: "test",
      sourceIds: ["src_acme_onboarding"],
    };
    const result = resolveVisibleSources(answer, sources, viewer);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("src_acme_onboarding");
  });
});
