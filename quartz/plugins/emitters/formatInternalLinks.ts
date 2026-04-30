import { visit } from "unist-util-visit"
import type { Root } from "hast"

export function formatInternalLinks(tree: Root, file: any, allFiles: any[]): Root {
  const slug = file.data.slug!
  const allSlugs = allFiles.map((f) => f.slug).filter(Boolean) as string[]

  visit(tree, "element", (elem, index, parent) => {
    if (elem.tagName === "a" && elem.properties.href) {
      const dataSlug = elem.properties["data-slug"] as string | undefined
      const href = elem.properties.href.toString()

      //
      // 1. Canonicalise ALL internal links
      //
      if (dataSlug) {
        elem.properties.href = "/" + dataSlug
      }

      //
      // 2. Self-reference
      //
      if (dataSlug === slug) {
        elem.properties.className = "self-reference"
        delete elem.properties.href
        elem.tagName = "span"
        return
      }

      //
      // 3. Skip anchors and assets
      //
      if (href.startsWith("#")) return
      if (href.includes("/assets")) return

      //
      // 4. Clean up /atlas/ links
      //
      if (href.includes("/atlas/") && !elem.properties.className?.includes("external")) {
        elem.properties.href = href.replace("/atlas", "")

        // Further check for _virtual-pages
        if(elem.properties.href.includes("/_virtual-pages/")) {
          elem.properties.href = elem.properties.href.replace("/_virtual-pages", "")
        }

        return
      }

      //
      // 5. Internal link validation
      //
      if (dataSlug && !allSlugs.includes(dataSlug)) {
        // Replace <a> entirely with a text node containing its text content
        // const text = elem.children
        //   ?.map((c) => (c.type === "text" ? c.value : ""))
        //   .join("") || ""

        // parent.children[index] = { type: "text", value: text }
        parent.children.splice(index, 1, ...elem.children)
        return
      }

      //
      // 6. External link — leave untouched
      //
      return
    }

    //
    // 7. Image cleanup
    //
    if (elem.tagName === "img" && elem.properties.src) {
      const src = elem.properties.src.toString()
      if (src.startsWith("../public")) {
        elem.properties.src = src.replace("../public", "")
        return
      }
      if (src.startsWith("./public")) {
        elem.properties.src = src.replace("./public", "")
        return
      }
    }
  })

  return tree
}