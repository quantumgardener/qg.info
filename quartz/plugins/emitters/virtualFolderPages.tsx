import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { ProcessedContent, QuartzPluginData, defaultProcessedContent } from "../vfile"
import { FullPageLayout } from "../../cfg"
import {
  FullSlug,
  SimpleSlug,
  joinSegments,
  pathToRoot,
} from "../../util/path"
import { defaultListPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { FolderContent } from "../../components"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { StaticResources } from "../../util/resources"
interface FolderPageOptions extends FullPageLayout {
  sort?: (f1: QuartzPluginData, f2: QuartzPluginData) => number
}

async function* processFolderInfo(
  ctx: BuildCtx,
  folderInfo: Record<SimpleSlug, ProcessedContent>,
  allFiles: QuartzPluginData[],
  opts: FullPageLayout,
  resources: StaticResources,
) {
  for (const [folder, folderContent] of Object.entries(folderInfo) as [
    SimpleSlug,
    ProcessedContent,
  ][]) {
    const slug = joinSegments(folder, "index") as FullSlug
    const [tree, file] = folderContent
    const cfg = ctx.cfg.configuration
    const externalResources = pageResources(pathToRoot(slug), resources)
    const componentData: QuartzComponentProps = {
      ctx,
      fileData: file.data,
      externalResources,
      cfg,
      children: [],
      tree,
      allFiles,
    }

    const content = renderPage(cfg, slug, componentData, opts, externalResources)
    yield write({
      ctx,
      content,
      slug,
      ext: ".html",
    })
  }
}

export const VirtualFolderPages: QuartzEmitterPlugin<Partial<FolderPageOptions>> = (userOpts) => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: FolderContent({ sort: userOpts?.sort }),
    ...userOpts,
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  // Uses PageList to render. ***LISTS MUST MATCH** or page will be blank
  const virtualFolders: Record<string, { title: string, description: string }> = {
    books: { title: "Books", description: "This is a list of all books referenced on the site. Hover for title and rating, click for detail." },
    movies: { title: "Movies", description: "This is a list of all movies referenced on the site. Hover for title and rating, click for detail." },
    "tv-shows": { title: "TV shows", description: "This is a list of all TV shows referenced on the site. Hover for title and rating, click for detail." },
    "video-games": { title: "Video games", description: "This is a list of all video games referenced on the site. Hover for title and rating, click for detail." },
  }

  return {
    name: "VirtualFolderPages",

    getQuartzComponents() {
      return [
        Head,
        Header,
        Body,
        ...header,
        ...beforeBody,
        pageBody,
        ...afterBody,
        ...left,
        ...right,
        Footer,
      ]
    },

    async *emit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)

      for (const [folder, meta] of Object.entries(virtualFolders)) {
        const folderInfo = {
          [folder]: defaultProcessedContent({
            slug: joinSegments(folder, "index") as FullSlug,
            frontmatter: {
              title: meta.title,
              tags: [],
            },
            description: meta.description
          }),
        }

        yield* processFolderInfo(ctx, folderInfo, allFiles, opts, resources)
      }
    },

    async *partialEmit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)

      for (const [folder, meta] of Object.entries(virtualFolders)) {
        const folderInfo = {
          [folder]: defaultProcessedContent({
            slug: joinSegments(folder, "index") as FullSlug,
            frontmatter: {
              title: meta.title,
              tags: [],
            },
          }),
        }

        yield* processFolderInfo(ctx, folderInfo, allFiles, opts, resources)
      }
    },
  }
}
