import { visit } from "unist-util-visit"
import type { Root } from "hast"
import { resolveRelative, splitAnchor } from "../../util/path"

export function buryDeadLinks(tree: Root, file: any, allFiles: any[]): Root {
  const slug = file.data.slug!
  const allSlugs = allFiles.map((f) =>
    f.slug ? resolveRelative(slug, f.slug) : ""
  )

  visit(tree, "element", (elem) => {
    if (elem.tagName === "a" && elem.properties.href) {
      const href = elem.properties.href.toString()

      if (elem.properties['data-slug'] == slug) {
        elem.properties.className = "self-reference"
        delete elem.properties.href
        elem.tagName = "span"
        return
      }

      if (href.startsWith("#")) return

      if (href.includes("/public/")) {
        elem.properties.href = href.replace("/public", "")
        return
      }


      if (!allSlugs.includes(splitAnchor(href)[0])) {
        if (elem.properties.className === undefined) {
          elem.properties.className = "dead-link"
        } else if (Array.isArray(elem.properties.className)) {
          if (elem.properties.className.includes("external")) return
          elem.properties.className.push("dead-link")
        } else if (typeof elem.properties.className === "string") {
          if (elem.properties.className.includes("external")) return
          elem.properties.className += " dead-link"
        } else {
          return
        }
        elem.properties.className = "dead-link"
        elem.properties['data-slug'] = "dead-link"
        delete elem.properties.href
        elem.tagName = "span"
      }
    }

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
