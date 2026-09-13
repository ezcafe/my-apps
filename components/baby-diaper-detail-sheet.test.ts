import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyDiaperDetailSheetForm, babyDiaperSheetAllowDismiss } from "@/components/baby-diaper-detail-sheet";

const t = (key: string) => key;

describe("BabyDiaperDetailSheetForm", () => {
  it("shows color red-flag warn for white_pale / red_bloody drafts", () => {
    for (const color of ["white_pale", "red_bloody"] as const) {
      const html = renderToStaticMarkup(
        createElement(BabyDiaperDetailSheetForm, {
          diaperKind: "dirty",
          initialDraft: { color },
          onCancel: () => {},
          onSave: () => {},
          t,
        }),
      );
      assert.match(html, /data-diaper-warn="color-red-flag"/);
      assert.match(html, /diaper\.colorRedFlagWarn/);
      assert.match(html, new RegExp(`data-diaper-color="${color}"[^>]*aria-pressed="true"`));
    }
  });

  it("shows texture caution for watery / hard drafts", () => {
    for (const texture of ["watery", "hard"] as const) {
      const html = renderToStaticMarkup(
        createElement(BabyDiaperDetailSheetForm, {
          diaperKind: "mixed",
          initialDraft: { texture },
          onCancel: () => {},
          onSave: () => {},
          t,
        }),
      );
      assert.match(html, /data-diaper-warn="texture-caution"/);
      assert.match(html, /diaper\.textureCautionWarn/);
    }
  });

  it("does not warn for ordinary color/texture", () => {
    const html = renderToStaticMarkup(
      createElement(BabyDiaperDetailSheetForm, {
        diaperKind: "dirty",
        initialDraft: { color: "yellow", texture: "soft" },
        onCancel: () => {},
        onSave: () => {},
        t,
      }),
    );
    assert.doesNotMatch(html, /data-diaper-warn=/);
  });

  it("Cancel is wired to onCancel only — Save is separate (W1 no auto-mutation)", () => {
    let cancelCalls = 0;
    let saveCalls = 0;
    const html = renderToStaticMarkup(
      createElement(BabyDiaperDetailSheetForm, {
        diaperKind: "dirty",
        initialDraft: { color: "white_pale", texture: "watery" },
        onCancel: () => {
          cancelCalls += 1;
        },
        onSave: () => {
          saveCalls += 1;
        },
        t,
      }),
    );
    // Structure: Cancel + Save present; mounting alone must not mutate.
    assert.match(html, /common\.cancel/);
    assert.match(html, /home\.diaperSheetSave/);
    assert.equal(cancelCalls, 0);
    assert.equal(saveCalls, 0);
  });

  it("disables Cancel while saving so dismiss cannot race the mutation (W1)", () => {
    const idle = renderToStaticMarkup(
      createElement(BabyDiaperDetailSheetForm, {
        diaperKind: "dirty",
        saving: false,
        onCancel: () => {},
        onSave: () => {},
        t,
      }),
    );
    const saving = renderToStaticMarkup(
      createElement(BabyDiaperDetailSheetForm, {
        diaperKind: "dirty",
        saving: true,
        onCancel: () => {},
        onSave: () => {},
        t,
      }),
    );
    // HTML disabled attribute on Cancel (not CSS disabled: classes).
    const cancelBefore = (html: string) => {
      const i = html.indexOf("common.cancel");
      return html.slice(Math.max(0, i - 120), i);
    };
    assert.doesNotMatch(cancelBefore(idle), /\sdisabled(=|\s|>)/);
    assert.match(cancelBefore(saving), /\sdisabled(=|\s|>)/);
  });
});

describe("babyDiaperSheetAllowDismiss", () => {
  it("blocks dismiss while saving; allows when idle", () => {
    assert.equal(babyDiaperSheetAllowDismiss(true), false);
    assert.equal(babyDiaperSheetAllowDismiss(false), true);
    assert.equal(babyDiaperSheetAllowDismiss(undefined), true);
  });
});
