"""Regenerate assets/js/widgets/emdb-browser.js, the static emdatabase browser embedded in the blog.

The widget is the kernel-free browser from the emdatabase docs site (docs/source/_build_docs.py in
https://github.com/electronmicroscopy/emdatabase, MIT): the package's own common.js and browser.css, with the dataset catalogue baked
in as JSON at generation time. Rerun it to pick up new datasets:

    docker run --rm -v "D:/code/arthurmccray.github.io:/site" -w /site python:3.12-slim \
        bash -c "pip install -q em-database && python -I bin/update-emdatabase-widget.py"
"""

import json
import sys
from importlib import metadata, resources
from pathlib import Path

from emdatabase import catalogue
from emdatabase.metadata import acquisition_techniques

OUT = Path(__file__).resolve().parent.parent / "assets" / "js" / "widgets" / "emdb-browser.js"
STATIC = resources.files("emdatabase") / "static"


def payload():
    """The dataset catalogue and its tab list, as the docs site builds them, minus anything about this machine's disk."""
    cat = catalogue.catalogue(kind="dataset")
    for group in cat["groups"]:
        for item in group["items"]:
            item.update(downloaded=False, location=None, path="", user_path="")
    present = [group["technique"] for group in cat["groups"]]
    tabs = catalogue.ordered_groups([*acquisition_techniques(), *present])
    return {"groups": cat["groups"], "n_total": cat["n_total"]}, tabs


# Fits the notebook widget's styles into a blog column: full width, readable sizes, a list/details split that stacks on phones, and
# resets for the site's own button, link and code styles.
OVERRIDES = """
.emdb { max-width: 100%; margin: 1rem 0 1.5rem; font-size: 14px; line-height: 1.4; text-align: left; }
.emdb-body { height: 480px; }
.emdb-list { min-width: 0; width: 46%; max-width: 46%; flex: 0 0 46%; }
.emdb-search { font-size: 14px; padding: 8px 11px; }
.emdb-name { font-size: 14px; }
.emdb-d-title { font-size: 18px; }
.emdb-d-desc { font-size: 13.5px; line-height: 1.55; }
.emdb-d-meta { grid-template-columns: minmax(0, 1fr); }
.emdb p, .emdb .emdb-brand, .emdb .emdb-name, .emdb .emdb-d-title { color: var(--emdb-text); }
.emdb code { color: var(--emdb-text); background: none; padding: 0; font-size: 12.5px; white-space: pre-wrap; word-break: break-word; }
.emdb button { font-family: var(--emdb-font); }
.emdb-dl-link { margin-top: 12px; }
.emdb-dl-anchor { color: var(--emdb-blue) !important; text-decoration: none; font-weight: 600; }
.emdb-dl-anchor:hover { text-decoration: underline; }
@media (max-width: 640px) {
  .emdb-body { flex-direction: column; height: auto; }
  .emdb-list { width: 100%; max-width: 100%; flex: none; max-height: 260px; }
  .emdb-details { max-height: 420px; }
}
"""

# Adapted from _DOCS_BROWSER_JS in emdatabase's docs/source/_build_docs.py: renders into the element it is given instead of #root, and
# its load snippet matches the blog post. common.js goes in front of it.
RENDER = r"""
function render({ el: root }) {
  if (!document.getElementById("emdb-browser-css")) {
    const style = document.createElement("style");
    style.id = "emdb-browser-css";
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  root.classList.add("emdb");
  const what = LABEL.toLowerCase();
  const state = { tab: "All", search: "", selected: null, hovered: null };
  const view = { versions: {}, redraw: () => drawDetails() };
  const allItems = DATA.groups.flatMap((g) => g.items);

  const header = el("div", "emdb-header");
  const top = el("div", "emdb-header-top", `<div class="emdb-brand"><span class="emdb-diamond">◆</span> ${esc(LABEL)}</div>`);
  top.appendChild(el("div", "emdb-count", `${DATA.n_total} ${what}`));
  const search = el("input", "emdb-search");
  search.type = "text";
  search.placeholder = `Search ${what}…`;
  search.addEventListener("input", () => { state.search = search.value; drawList(); });
  header.append(top, search);
  const tabsEl = el("div", "emdb-tabs");
  const listEl = el("div", "emdb-list");
  const detailsEl = el("div", "emdb-details");
  const body = el("div", "emdb-body");
  body.append(listEl, detailsEl);
  root.append(header, tabsEl, body);

  function drawRow(item) {
    const row = el("div", "emdb-row" + (state.selected === item.name ? " selected" : ""));
    row.append(el("span", "emdb-glyph off", "•"), el("span", "emdb-name", esc(item.name)),
      el("span", "emdb-meta", esc(item.size)));
    row.addEventListener("mouseenter", () => { state.hovered = item.name; drawDetails(); });
    row.addEventListener("click", () => { state.selected = item.name; drawList(); });
    return row;
  }

  function drawList() {
    fillList(listEl, DATA.groups, state, drawRow, `No ${what} match.`);
    state.selected ??= allItems[0]?.name;
    drawDetails();
  }

  function drawDetails() {
    const item = allItems.find((it) => it.name === (state.hovered || state.selected));
    if (!item) {
      detailsEl.innerHTML = `<div class="emdb-details-empty">Hover or select an entry.</div>`;
      return;
    }
    detailsEl.innerHTML = "";
    drawHead(detailsEl, item, "", view);
    if (item.description) detailsEl.appendChild(el("p", "emdb-d-desc", esc(item.description)));
    detailsEl.appendChild(drawMeta(item));
    detailsEl.appendChild(el("div", "emdb-load-label", "Load"));
    detailsEl.appendChild(copyRow(`from emdatabase.data import ${item.name}\n\npath = ${item.name}().download()`));
    const link = el("a", "emdb-dl-anchor");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = item.archive
      ? `⤓ Download ${item.url.split("/").pop()} (archive holding ${item.archive})`
      : `⤓ Download ${item.file}`;
    const wrap = el("div", "emdb-dl-link");
    wrap.appendChild(link);
    detailsEl.appendChild(wrap);
  }

  listEl.addEventListener("mouseleave", () => { state.hovered = null; drawDetails(); });
  fillTabs(tabsEl, TABS, state, drawList);
  drawList();
}

export default { render };
"""


def main():
    data, tabs = payload()
    version = metadata.version("em-database")
    css = (STATIC / "browser.css").read_text(encoding="utf-8") + OVERRIDES
    source = (
        f"// GENERATED by bin/update-emdatabase-widget.py from em-database {version}; do not edit by hand.\n"
        "// The static emdatabase dataset browser (https://github.com/electronmicroscopy/emdatabase, MIT license), adapted from\n"
        "// the package's docs site for <div data-widget=\"emdb-browser\"> plus assets/js/widgets/mount.js.\n\n"
        f"const DATA = {json.dumps(data)};\n"
        f"const TABS = {json.dumps(tabs)};\n"
        'const LABEL = "Datasets";\n'
        f"const CSS = {json.dumps(css)};\n\n"
        + (STATIC / "common.js").read_text(encoding="utf-8")
        + RENDER
    )
    OUT.write_text(source, encoding="utf-8", newline="\n")
    sys.stdout.write(f"wrote {OUT} ({len(source) // 1024} KB, {data['n_total']} datasets, em-database {version})\n")


if __name__ == "__main__":
    main()
