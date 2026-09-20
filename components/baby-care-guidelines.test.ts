import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyCareGuidelines } from "@/components/baby-care-guidelines";
import {
  BABY_CARE_GUIDE_STAGE_IDS,
  BABY_CARE_GUIDE_SUBSECTION_IDS,
  buildBabyCareGuidelineModel,
} from "@/lib/baby-care-guideline-content";
import { babyEn, type BabyMessageKey } from "@/messages/baby/en";
import { babyVi } from "@/messages/baby/vi";

function tVi(key: BabyMessageKey): string {
  return babyVi[key] ?? key;
}

function tEn(key: BabyMessageKey): string {
  return babyEn[key] ?? key;
}

describe("buildBabyCareGuidelineModel", () => {
  it("VI: Section I room-temp / body-temp / SIDS + five stages with subsections", () => {
    const model = buildBabyCareGuidelineModel(tVi, "vi");
    assert.equal(model.mode, "full");
    assert.match(model.sectionI.title, /nhiệt độ|phòng ngủ/i);
    assert.ok(model.sectionI.intro.length > 20);
    assert.ok(model.sectionI.roomTemp.includes("26"));
    assert.ok(model.sectionI.bodyTempLines.length >= 2);
    assert.match(model.sectionI.sids, /SIDS|nằm ngửa/i);
    assert.equal(model.stages.length, 5);
    assert.deepEqual(
      model.stages.map((s) => s.id),
      [...BABY_CARE_GUIDE_STAGE_IDS],
    );
    for (const stage of model.stages) {
      assert.equal(stage.subsections.length, 5);
      assert.deepEqual(
        stage.subsections.map((s) => s.id),
        [...BABY_CARE_GUIDE_SUBSECTION_IDS],
      );
      for (const sub of stage.subsections) {
        assert.ok(sub.title.length > 0, `${stage.id}.${sub.id} title`);
        assert.ok(sub.lines.length > 0, `${stage.id}.${sub.id} lines`);
      }
      const health = stage.subsections.find((s) => s.id === "health");
      assert.ok(health);
      assert.match(health!.title, /Y tế dự phòng/i);
    }
    // At least one stage health body keeps medical markers (not title-only).
    const healthBodies = model.stages
      .map((s) => s.subsections.find((sub) => sub.id === "health")?.lines.join("\n") ?? "")
      .join("\n");
    assert.match(healthBodies, /Vitamin/i);
    assert.match(healthBodies, /TCMR|Vaccine|vắc-xin|vaccine/i);
  });

  it("EN: Section I room-temp / SIDS + five stages with full subsections", () => {
    const model = buildBabyCareGuidelineModel(tEn, "en");
    assert.equal(model.mode, "full");
    assert.match(model.sectionI.title, /Room Temperature|Sleep Environment/i);
    assert.ok(model.sectionI.intro.length > 20);
    assert.ok(model.sectionI.roomTemp.includes("26"));
    assert.ok(model.sectionI.bodyTempLines.length >= 2);
    assert.match(model.sectionI.sids, /SIDS|back/i);
    assert.equal(model.stages.length, 5);
    for (const stage of model.stages) {
      assert.equal(stage.subsections.length, 5);
      for (const sub of stage.subsections) {
        assert.ok(sub.title.length > 0, `${stage.id}.${sub.id} title`);
        assert.ok(sub.lines.length > 0, `${stage.id}.${sub.id} lines`);
      }
    }
    const healthBodies = model.stages
      .map((s) => s.subsections.find((sub) => sub.id === "health")?.lines.join("\n") ?? "")
      .join("\n");
    assert.match(healthBodies, /Vitamin/i);
    assert.match(healthBodies, /Vaccine|BCG|MMR/i);
    assert.match(
      model.stages.find((s) => s.id === "newborn")!.subsections.find((s) => s.id === "sleep")!
        .lines.join(" "),
      /16\s*[–-]\s*18/,
    );
  });
});

describe("BabyCareGuidelines", () => {
  it("renders Section I + II + five stages all collapsed by default", () => {
    const model = buildBabyCareGuidelineModel(tVi, "vi");
    const html = renderToStaticMarkup(
      createElement(BabyCareGuidelines, { model }),
    );
    assert.match(html, /data-testid="baby-care-guidelines"/);
    assert.match(html, /data-guide-mode="full"/);
    assert.match(html, /<details[^>]*data-guide-block="section-i"/);
    assert.match(html, /<details[^>]*data-guide-block="section-ii"/);
    assert.doesNotMatch(html, /baby-guideline-feed|baby-guideline-pump/);
    for (const id of BABY_CARE_GUIDE_STAGE_IDS) {
      assert.match(html, new RegExp(`data-guide-stage="${id}"`));
    }
    // Native <details> collapsed: no open on Section I/II or stage panels.
    assert.doesNotMatch(html, /data-guide-block="section-i"[^>]*\sopen[\s>]/);
    assert.doesNotMatch(html, /data-guide-block="section-ii"[^>]*\sopen[\s>]/);
    assert.doesNotMatch(html, /data-guide-stage="[^"]+"[^>]*\sopen[\s>]/);
    assert.match(html, /data-guide-section-collapsed/);
    assert.match(html, /data-guide-stage-collapsed/);
    assert.match(html, /data-guide-stage-body/);
    assert.match(html, /data-guide-subsection="sleep"/);
    assert.match(html, /data-guide-subsection="health"/);
    assert.match(html, /data-guide-caveat/);
    assert.match(
      html,
      /Thông tin này chỉ nhằm mục đích tham khảo\. Để được tư vấn hoặc chẩn đoán y tế/,
    );
  });

  it("EN full mode: Section I/II and stages are collapsible details (collapsed)", () => {
    const model = buildBabyCareGuidelineModel(tEn, "en");
    const html = renderToStaticMarkup(
      createElement(BabyCareGuidelines, { model }),
    );
    assert.match(html, /data-guide-mode="full"/);
    assert.match(html, /<details[^>]*data-guide-block="section-i"/);
    assert.match(html, /<details[^>]*data-guide-block="section-ii"/);
    assert.doesNotMatch(html, /data-guide-block="placeholder"/);
    for (const id of BABY_CARE_GUIDE_STAGE_IDS) {
      assert.match(html, new RegExp(`<details[^>]*data-guide-stage="${id}"`));
    }
    assert.doesNotMatch(html, /data-guide-block="section-i"[^>]*\sopen[\s>]/);
    assert.doesNotMatch(html, /data-guide-block="section-ii"[^>]*\sopen[\s>]/);
    assert.doesNotMatch(html, /data-guide-stage="[^"]+"[^>]*\sopen[\s>]/);
    assert.match(html, /Newborn Stage|0 - 1 Month/i);
    assert.match(
      html,
      /This information is for reference only\. For medical advice or diagnosis/,
    );
  });
});
