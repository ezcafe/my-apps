import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { mergeMoneyFamilyHeadingViewModel } from "@/lib/money-family-heading-merge";

const resolved = {
  title: "Investments",
  breadcrumbs: [] as { label: string; href?: string }[],
  cta: { href: "/investments/new", label: "Record activity" },
  meta: "Portfolio list",
};

describe("mergeMoneyFamilyHeadingViewModel", () => {
  it("uses resolved title/crumbs/cta when override and actions are absent", () => {
    const vm = mergeMoneyFamilyHeadingViewModel({
      resolved,
      override: null,
      headerActions: null,
    });
    assert.equal(vm.title, "Investments");
    assert.deepEqual(vm.breadcrumbs, []);
    assert.equal(vm.meta, "Portfolio list");
    assert.equal(vm.customActions, null);
    assert.deepEqual(vm.ctaLink, {
      href: "/investments/new",
      label: "Record activity",
    });
  });

  it("lets override win title, breadcrumbs, and cta", () => {
    const vm = mergeMoneyFamilyHeadingViewModel({
      resolved,
      override: {
        title: "Edit instrument",
        breadcrumbs: [
          { label: "Investments", href: "/investments" },
          { label: "Edit" },
        ],
        cta: { href: "/investments/new", label: "Other" },
        description: "About edit",
        meta: "Override meta",
      },
      headerActions: null,
    });
    assert.equal(vm.title, "Edit instrument");
    assert.equal(vm.breadcrumbs.length, 2);
    assert.equal(vm.description, "About edit");
    assert.equal(vm.meta, "Override meta");
    assert.deepEqual(vm.ctaLink, {
      href: "/investments/new",
      label: "Other",
    });
  });

  it("clears default CTA when override sets cta: null", () => {
    const vm = mergeMoneyFamilyHeadingViewModel({
      resolved,
      override: { cta: null },
      headerActions: null,
    });
    assert.equal(vm.title, "Investments");
    assert.equal(vm.ctaLink, null);
    assert.equal(vm.customActions, null);
  });

  it("prefers custom headerActions over resolved CTA", () => {
    const actions = createElement("button", { type: "button" }, "More");
    const vm = mergeMoneyFamilyHeadingViewModel({
      resolved,
      override: null,
      headerActions: actions,
    });
    assert.equal(vm.customActions, actions);
    assert.equal(vm.ctaLink, null);
  });
});
