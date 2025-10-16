import { QuartzFilterPlugin } from "../types"

export const DelayPublish: QuartzFilterPlugin = () => ({
  name: "DelayPublish",
  shouldPublish(_ctx, [_tree, vfile]) {
    const noteDate = new Date(vfile.data?.frontmatter?.datetime as string)
    const now = new Date()
    return noteDate < now
  },
})
