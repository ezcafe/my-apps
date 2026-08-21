import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
  TableSortButton,
  tableAlignClass,
  tableFreezeClass,
  tableSortAria,
} from "@/components/ui/table";

describe("tableAlignClass", () => {
  it("maps start to text-left and end to text-right", () => {
    assert.equal(tableAlignClass("start"), "text-left");
    assert.equal(tableAlignClass("end"), "text-right");
    assert.equal(tableAlignClass(), "text-left");
  });
});

describe("tableFreezeClass", () => {
  it("returns sticky left slots", () => {
    assert.equal(tableFreezeClass("leading"), "sticky left-0 z-10");
    assert.equal(tableFreezeClass("afterCheckbox"), "sticky left-10 z-10");
    assert.equal(tableFreezeClass(undefined), undefined);
  });
});

describe("tableSortAria", () => {
  it("maps direction to aria-sort values", () => {
    assert.equal(tableSortAria("asc"), "ascending");
    assert.equal(tableSortAria("desc"), "descending");
    assert.equal(tableSortAria("none"), "none");
  });
});

describe("Table markup", () => {
  it("applies text-right only for align=end on head and cell", () => {
    const headEnd = renderToStaticMarkup(
      createElement(TableHead, { align: "end" }, "Amount"),
    );
    const headStart = renderToStaticMarkup(
      createElement(TableHead, { align: "start" }, "Date"),
    );
    const cellEnd = renderToStaticMarkup(
      createElement(TableCell, { align: "end", numeric: true }, "12"),
    );

    assert.match(headEnd, /text-right/);
    assert.doesNotMatch(headStart, /text-right/);
    assert.match(cellEnd, /text-right/);
    assert.match(cellEnd, /tabular-nums/);
  });

  it("sets aria-sort via TableHead and keeps justify-end on numeric sort buttons", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TableHead,
        { align: "end", "aria-sort": tableSortAria("desc") },
        createElement(
          TableSortButton,
          { align: "end", direction: "desc" },
          "Amount",
        ),
      ),
    );
    assert.match(markup, /aria-sort="descending"/);
    assert.match(markup, /justify-end/);
    assert.match(markup, /↓/);
  });

  it("marks selected and accent rows", () => {
    const selected = renderToStaticMarkup(
      createElement(TableRow, { selected: true }, createElement(TableCell, null, "a")),
    );
    const accent = renderToStaticMarkup(
      createElement(TableRow, { accent: true }, createElement(TableCell, null, "b")),
    );
    assert.match(selected, /data-selected=""/);
    assert.match(accent, /data-accent=""/);
  });

  it("adds freeze classes when freeze is set", () => {
    const leading = renderToStaticMarkup(
      createElement(TableHead, { freeze: "leading" }, "☐"),
    );
    const after = renderToStaticMarkup(
      createElement(TableCell, { freeze: "afterCheckbox" }, "Date"),
    );
    assert.match(leading, /sticky left-0/);
    assert.match(after, /sticky left-10/);
  });

  it("constrains height when maxHeight is set", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Table,
        { maxHeight: 320 },
        createElement(
          TableHeader,
          null,
          createElement(TableRow, null, createElement(TableHead, null, "A")),
        ),
        createElement(
          TableBody,
          null,
          createElement(TableRow, null, createElement(TableCell, null, "1")),
        ),
      ),
    );
    assert.match(markup, /max-height:320px/);
    assert.match(markup, /overflow-auto/);
  });

  it("renders row actions with hover-reveal utilities", () => {
    const markup = renderToStaticMarkup(
      createElement(TableRowActions, null, "Edit"),
    );
    assert.match(markup, /group-hover\/row:opacity-100/);
    assert.match(markup, /group-focus-within\/row:opacity-100/);
  });
});
