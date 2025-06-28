import { QuartzTransformerPlugin } from "../../types"
import { visit } from "unist-util-visit"
import { Element, Root } from "hast"

export const RemoveInternalFromPhotoLinks: QuartzTransformerPlugin = () => {
  return {
    name: "RemoveInternalFromPhotoLinks",
    htmlPlugins() {
      return [
        () => (tree: Root) => {
          console.log("✅ Plugin running on tree")

          visit(tree, "element", (node: Element) => {
            if (
              node.tagName === "a" &&
              typeof node.properties?.href === "string" &&
              node.properties.href === "#" &&
              typeof node.properties.dataFullsize === "string" &&
              node.properties.dataFullsize.startsWith("/photos")
            ) {
              console.log("🔍 Found photo-like link:", node.properties.dataFullsize)
              const classes = node.properties.className as string[] | undefined
              if (classes?.includes("internal")) {
                node.properties.className = classes.filter(c => c !== "internal")
              }
            }
          })
        },
      ]
    },
  }
}
