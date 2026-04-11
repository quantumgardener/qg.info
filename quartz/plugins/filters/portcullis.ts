import { QuartzFilterPlugin } from "../types"
import chalk from "chalk";

// Set the list of illegal patterns here. Anything beginning with class/* has had the class/ removed.
// e.g. use "blog" and not "class/blog"
const illegalTagPatterns = [
    "journal/",     // ALL journal entries
    "class/class"   // Internal list of class pages
]

export const Portcullis: QuartzFilterPlugin = () => ({
  name: "Portucllis",
  shouldPublish(_ctx, [_tree, vfile]) {

    const publish = vfile.data?.frontmatter?.publish
    if(publish == null) {
        //full abort, this is an error condition in the originating vault. Every file must have publish set
        console.error(chalk.redBright(`Publish state missing in: `), chalk.yellow(`${vfile.data?.frontmatter?.title}\n`));
        process.exit(1)
    }

    switch(publish) {
        case "deny":
            console.debug(chalk.yellow(`Deny: ${vfile.data?.frontmatter?.title}`))
            return false;
        case "undecided":
            console.debug(chalk.yellow(`Undecided: ${vfile.data?.frontmatter?.title}`))
            return false
        case "allow":
            // Check for illegal tags
            const tags = vfile.data?.frontmatter?.tags ?? []
            const illegalTagsFound = tags.some(tag =>
                illegalTagPatterns.some(prefix =>
                    tag.toLowerCase().startsWith(prefix)
                )
            )
            if(illegalTagsFound) {
                console.debug(chalk.yellow(`Illegal tags in: ${vfile.data?.frontmatter?.title}`))
                return false
            }

            // A date in the future means do not publish yet
            const noteDate = new Date(vfile.data?.frontmatter?.datetime as string)
            const now = new Date()
            if(noteDate > now) {
                console.info(chalk.yellow(`Future dated: ${vfile.data?.frontmatter?.title}`))
                return false
            }
            //console.debug(chalk.greenBright(`Allow: ${vfile.data?.frontmatter?.title}`))
            return true
        default:
            // Error, unknown value
            console.error(chalk.redBright(`Unrecognised publish state "${publish}" in: `), chalk.yellow(`${vfile.data?.frontmatter?.title}\n`));
            process.exit(1)
    }
  },
})

//allow, deny, undecided