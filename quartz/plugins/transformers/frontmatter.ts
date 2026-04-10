import matter from "gray-matter"
import remarkFrontmatter from "remark-frontmatter"
import { QuartzTransformerPlugin } from "../types"
import yaml from "js-yaml"
import toml from "toml"
import { FilePath, FullSlug, getFileExtension, slugifyFilePath, slugTag } from "../../util/path"
import { QuartzPluginData } from "../vfile"
import { i18n } from "../../i18n"
//import { toTitleCase } from "../../util/toTitleCase"

export interface Options {
  delimiters: string | [string, string]
  language: "yaml" | "toml"
}

const defaultOptions: Options = {
  delimiters: "---",
  language: "yaml",
}

function coalesceAliases(data: { [key: string]: any }, aliases: string[]) {
  for (const alias of aliases) {
    if (data[alias] !== undefined && data[alias] !== null) return data[alias]
  }
}

function coerceToArray(input: string | string[]): string[] | undefined {
  if (input === undefined || input === null) return undefined

  // coerce to array
  if (!Array.isArray(input)) {
    input = input
      .toString()
      .split(",")
      .map((tag: string) => tag.trim())
  }

  // remove all non-strings
  return input
    .filter((tag: unknown) => typeof tag === "string" || typeof tag === "number")
    .map((tag: string | number) => tag.toString())
}

function getAliasSlugs(aliases: string[]): FullSlug[] {
  const res: FullSlug[] = []
  for (const alias of aliases) {
    const isMd = getFileExtension(alias) === "md"
    const mockFp = isMd ? alias : alias + ".md"
    const slug = slugifyFilePath(mockFp as FilePath)
    res.push(slug)
  }

  return res
}

export const FrontMatter: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "FrontMatter",
    markdownPlugins(ctx) {
      const { cfg, allSlugs } = ctx
      return [
        [remarkFrontmatter, ["yaml", "toml"]],
        () => {
          return (_, file) => {
            const fileData = Buffer.from(file.value as Uint8Array)
            const { data } = matter(fileData, {
              ...opts,
              engines: {
                yaml: (s) => yaml.load(s, { schema: yaml.JSON_SCHEMA }) as object,
                toml: (s) => toml.parse(s) as object,
              },
            })

            if (data.title != null && data.title.toString() !== "") {
              data.title = data.title.toString()
            } else {
              data.title = file.stem ?? i18n(cfg.configuration.locale).propertyDefaults.title
            }
            //data.title = toTitleCase(data.title)

            let classes: string[] = []
            data.keywords = []
            const tags = coerceToArray(coalesceAliases(data, ["tags", "tag"]))
            if (tags) {            
              //
              // NOT PULLING IN ANY TAGS OTHER THAN THOSE TYPES PREFIXED BELOW
              // - class/* describes the type of note and kept as tags without the "class/" prefix
              // - keyword/* are for photos only and are funneled into a separate array
              //
              
              // Ensure there are no duplicate tags in the frontmatter. This can sometimes happen
              let uniqueTags = new Set(tags.map((tag: string) => slugTag(tag)))
    
              for (let tag of uniqueTags) {
                const tagGroup = tag.split("/")
                switch (tagGroup[0]) {
                  case "class":
                    classes.push(tag.replace("class/", "")) // add it in without the "class/"
                    break
                  case "keyword":
                    // The tag coming in is hiearchical, even if just one level. keyword/lvl1/lvl2/...
                    // We want the whole keyword, plus all it's level's parts
                    for (let part of tag.substring("keywords".length).split("/")) {
                      if (part === "") {
                        throw new RangeError(`Empty keyword for ${data.title}`)
                      }
                      if (!data.keywords.includes(part.toLowerCase())) {
                        data.keywords.push(part.toLowerCase())
                      }
                    }
                    break
                  default:
                    classes.push(tag)
                    break
                }   
              }
            }
            data.tags = classes

            const aliases = coerceToArray(coalesceAliases(data, ["aliases", "alias"]))
            if (aliases) {
              data.aliases = aliases // frontmatter
              file.data.aliases = getAliasSlugs(aliases)
              allSlugs.push(...file.data.aliases)
            }

            if (data.permalink != null && data.permalink.toString() !== "") {
              data.permalink = data.permalink.toString() as FullSlug
              const aliases = file.data.aliases ?? []
              aliases.push(data.permalink)
              file.data.aliases = aliases
              allSlugs.push(data.permalink)
            }

            const cssclasses = coerceToArray(coalesceAliases(data, ["cssclasses", "cssclass"]))
            if (cssclasses) data.cssclasses = cssclasses

            if (data.image) data.thumbnail = data.image.replace(/\[\[|\]\]/g,'')

            // inter-article links
            if (data.prev) data.prev = data.prev.replace(/\[\[|\]\]/g,'')
            if (data.next) data.next = data.next.replace(/\[\[|\]\]/g,'')

            const socialImage = coalesceAliases(data, ["socialImage", "image", "cover"])

            const created = coalesceAliases(data, ["datetime", "created", "date"])
            if (created) {
              data.created = created
            }

            const modified = coalesceAliases(data, [
              "modified",
              "lastmod",
              "updated",
              "last-modified",
            ])
            if (modified) data.modified = modified
            data.modified ||= created // if modified is not set, use created

            const published = coalesceAliases(data, ["published", "publishDate", "date"])
            if (published) data.published = published

            if (socialImage) data.socialImage = socialImage

            // Remove duplicate slugs
            const uniqueSlugs = [...new Set(allSlugs)]
            allSlugs.splice(0, allSlugs.length, ...uniqueSlugs)

            // fill in frontmatter
            file.data.frontmatter = data as QuartzPluginData["frontmatter"]
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    aliases: FullSlug[]
    frontmatter: { [key: string]: unknown } & {
      title: string
    } & Partial<{
        tags: string[]
        aliases: string[]
        modified: string
        created: string
        published: string
        description: string
        socialDescription: string
        publish: boolean | string
        draft: boolean | string
        lang: string
        enableToc: string
        cssclasses: string[]
        socialImage: string
        comments: boolean | string
        classes: string[]
        keywords: string[]
        uri: string
        series: string
        sequence: number
        image: string
        rating: number
      }>
  }
}
