# Community site prototype

[![Join the chat at https://gitter.im/galaxyproject/hub2](https://badges.gitter.im/galaxyproject/hub2.svg)](https://gitter.im/galaxyproject/hub2?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

This repository contains the framework - the code that generates the site.

It contains no content. To add content, clone this, then create a `content` directory in the root. All your Markdown files go in there.

## Creating static content

To see an example of how the files are organized, see the [`content`](https://github.com/NickSto/galaxy-hub/tree/gridhub/content) directory of [`gridhub`](https://github.com/NickSto/galaxy-hub/tree/gridhub) branch of [`galaxy-hub`](https://github.com/galaxyproject/galaxy-hub).

For static pages, you create a directory, whose name becomes the last part of the url. Then you create an `index.md` file inside it.

There are two types of static pages: Posts and Standalones.

### Posts

These pages are part of a series, like blog posts, news posts, or events.

To create a series (a [Collection](https://gridsome.org/docs/collections/) in Gridsome terms), make a directory in `content/posts/` (i.e. `content/posts/events/`. Then for each post, create a directory and `index.md` inside. There are two metadata fields required for each post: a `title` and `date`.

The url will be the directory path minus the `content/posts` part. I.e. `content/posts/events/2017-02-biogenomics-workshop/index.md` will be at `domain.com/events/2017-02-biogenomics-workshop/`.

### Standalones

These are one-off pages not (automatically) part of any series. You can just write any content you want about any topic, and place it at any url.

Just create a directory inside `content/standalone/` and put an `index.md` inside. The only required metadata field is `title`. You can put the directory at any depth you want, and the path becomes the url. I.e. `content/standalone/contributing/galaxy-hub/index.md` will be at `domain.com/contributing/galaxy-hub/`.

### Inserts

These are bits that get filled into other pages (usually dynamically generated ones). For example, you can create a site-wide footer by creating `content/standalone/site-footer.md`. Just fill it with Markdown and it'll be inserted at the bottom of every page on the site. And there's no metadata needed. Just like the static pages, the framework knows what url these go to based solely on where they're placed in the `content` directory. Then their filename determines which part of the page they're inserted into.

Each dynamic page can be customized with these. Currently that's:
| Page           | URL        | Directory               |
|:-------------- |:---------- |:----------------------- |
| Homepage       | `/`        | `content/standalone/`   |
| Events listing | `/events/` | `content/posts/events/` |
| News listing   | `/news/`   | `content/posts/news/`   |
| Blog listing   | `/blog/`   | `content/posts/blog/`   |

Each of these pages is dynamic because they contain auto-generated lists of other pages. But you can write whatever you want above the lists by writing Markdown into an `index.md` in the directory for that page. And to write content after the lists, make a `footer.md`.
