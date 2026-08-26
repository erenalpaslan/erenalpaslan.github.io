import type { RehypePlugin } from "@astrojs/markdown-remark";
import { visit } from "unist-util-visit";

/**
 * Wrap every markdown table in a scroll container.
 *
 * The design's rule is that the page body never scrolls horizontally; a wide
 * table has to scroll inside its own box. Markdown gives us a bare <table>,
 * so the wrapper is added here rather than asked of the author.
 */
export const rehypeTableWrap: RehypePlugin = () => (tree) => {
  visit(tree, "element", (node: any, index: any, parent: any) => {
    if (node.tagName !== "table" || !parent || index === null) return;
    if (parent.type === "element" && parent.properties?.className?.includes?.("table-scroll")) return;
    parent.children[index] = {
      type: "element",
      tagName: "div",
      properties: { className: ["table-scroll"] },
      children: [node],
    };
  });
};
