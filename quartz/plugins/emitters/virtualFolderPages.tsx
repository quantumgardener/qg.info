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
import { renderMarkdownToHtmlAst } from "../../util/myUtils"

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

  // Uses PageList.tsx to render. ***LISTS MUST MATCH** in components/pages/FolderContent.tsx "VirtualFolders" or page will be blank
  const virtualFolders: Record<string, { title: string, description: string, intro?: string }> = {
    blog: {
      title: "Blog",
      description: "A list of all past blog posts in reverse date order.",
      intro: `
Time-based notes as I share my thinking.

[[Subscribe]] to get the latest posts as soon as they are written. Use the links below to access the blog's archives. You can also access my many thoughts on [[Blogging]]. 

> [!NOTE]
> Blog entries are listed in order of most-recent first. Dates marked with † indicate the note has been updated since it was originally published.
`
    },
    books: { 
      title: "Books", 
      description: "This is a list of all movies referenced on the site. Hover for title and rating, click for detail."
    },
    "commander's-log": {
      title: "Commander's Log",
      description: "A list of Commanders log posts.",
      intro: `
![[cmdr-q4ntum.webp|right|200]]When checking out some quantum possibilities I picked up a strange signal. The origins are certainly the Milky Way galaxy yet they can't be from now. Have I stumbled across a closed timelike curve? All I have is a commander's log. Maybe Commander Q4NTUM is a distant ancestor? 

I'm cross-posting these log entries at <a rel="me" href="https://aus.social/@q4ntum">aus.social/@q4ntum</a> and via a dedicated [[RSS feed]] at  https://quantumgardener.info/cmdrs-log.xml
`
    },
    movies: { 
      title: "Movies", 
      description: "This is a list of all movies referenced on the site. Hover for title and rating, click for detail." 
    },
    now: {
      title: "Now",
      description: "Periodic updates on what I've recently achieved and where my next focus will be.",
      intro: `
This is my now page. It contains a list of posts about where I am in life and what I'm doing in the moment. For more see [about nownownow.com](https://nownownow.com/about)

Rather than a single page which keeps getting updated, I've created a link of all "Now" dates on my blog. I prefer this because it gives me a history of "now" over time. In other words, what was I doing when then was now.
`
    },
    "tv-shows": { 
      title: "TV shows", 
      description: "This is a list of all TV shows referenced on the site. Hover for title and rating, click for detail." 
    },
    "video-games": { 
      title: "Video games", 
      description: "This is a list of all video games referenced on the site. Hover for title and rating, click for detail." 
    },
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

        const markdown = meta.intro ?? meta.description
        const htmlAst = await renderMarkdownToHtmlAst(ctx, markdown, folder)

        const [root, vfile] = defaultProcessedContent({
          slug: joinSegments(folder, "index") as FullSlug,
          frontmatter: {
            title: meta.title,
            tags: [],
          },
          description: meta.description
        })

        root.children = htmlAst.children

        const folderInfo = {
          [folder]: [root, vfile]
        }

        yield* processFolderInfo(ctx, folderInfo, allFiles, opts, resources)
      }
    },

    async *partialEmit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)

      for (const [folder, meta] of Object.entries(virtualFolders)) {

        const markdown = meta.intro ?? meta.description
        const htmlAst = await renderMarkdownToHtmlAst(ctx, markdown, folder)

        const [root, vfile] = defaultProcessedContent({
          slug: joinSegments(folder, "index") as FullSlug,
          frontmatter: {
            title: meta.title,
            tags: [],
          },
          description: meta.description
        })

        root.children =htmlAst.children

        const folderInfo = {
          [folder]: [root, vfile]
        }

        yield* processFolderInfo(ctx, folderInfo, allFiles, opts, resources)
      }
    },
  }
}
