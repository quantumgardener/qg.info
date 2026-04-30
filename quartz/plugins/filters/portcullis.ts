import { findMixin } from "pixi.js";
import { PublishStatus } from "../../util/myUtils";
import { QuartzFilterPlugin } from "../types"
import chalk from "chalk";

// Set the list of illegal patterns here. Anything beginning with class/* has had the class/ removed.
// e.g. use "blog" and not "class/blog"
const illegalTagPatterns = [
    "journal/",             // ALL journal entries
    "class/class-index",    // Internal list of class pages
    "class/home",           // Places I've lived
    "class/travel-log"      // Collations of travel related journal entries
]

export const Portcullis: QuartzFilterPlugin = () => ({
  name: "Portucllis",
  shouldPublish(_ctx, [_tree, vfile]) {

    const frontmatter = vfile.data?.frontmatter
    if(!frontmatter || frontmatter.publish === undefined) {
        //full abort, this is an error condition in the originating vault. Every file must have publish set
        console.error(chalk.redBright(`Publish state missing in: `), chalk.yellow(`${frontmatter?.title}\n`));
        process.exit(1)
    }

    switch(frontmatter.publish) {
        case PublishStatus.DENY:
            console.debug(chalk.yellow(`Deny: ${frontmatter?.title}`))
            return false;
        case PublishStatus.UNDECIDED:
            console.debug(chalk.yellow(`Undecided: ${frontmatter?.title}`))
            return false
        case PublishStatus.ALLOW:
            // Check for illegal tags
            const tags = frontmatter?.tags ?? []
            const illegalTagsFound = tags.some(tag =>
                illegalTagPatterns.some(prefix =>
                    tag.toLowerCase().startsWith(prefix)
                )
            )
            if(illegalTagsFound) {
                console.debug(chalk.yellow(`Illegal tags in: ${frontmatter?.title}`))
                return false
            }

            // A date in the future means do not publish yet
            const noteDate = new Date(frontmatter?.datetime as string)
            const now = new Date()
            if(noteDate > now) {
                console.info(chalk.yellow(`Future dated: ${frontmatter?.title}`))
                return false
            }
            //console.debug(chalk.greenBright(`Allow: ${frontmatter?.title}`))
            return true
        default:
            // Error, unknown value
            console.error(chalk.redBright(`Unrecognised publish state "${frontmatter.publish}" in: `), chalk.yellow(`${frontmatter?.title}\n`));
            process.exit(1)
    }
  },
})

//allow, deny, undecided