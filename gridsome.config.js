// This is where project configuration and plugin options are located.
// Learn more: https://gridsome.org/docs/config

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

const slugify = string => string.toLowerCase().replace(/[^\w\d -]/g, '').replace(/[ -]+/g,'-');
const ensurePrefix = (string, char) => string.startsWith(char) ? string : char+string;
function rmPathPrefix(path, depth, absolute=null) {
  let inputIsAbsolute = path.startsWith("/");
  if (inputIsAbsolute) {
    depth++;
  }
  if (absolute === null) {
    absolute = inputIsAbsolute;
  }
  let fields = path.split("/");
  let newPath = fields.slice(depth).join("/");
  if (absolute) {
    return "/"+newPath;
  } else {
    return newPath;
  }
}
function makeFilenamePath(prefix, node) {
  let directory = rmPathPrefix(node.fileInfo.directory, 1, absolute=false);
  let path;
  if (directory === "") {
    path = node.fileInfo.name;
  } else {
    path = [directory, node.fileInfo.name].join("/");
  }
  return `/${prefix}:${path}`;
}
function logAndReturn(...values) {
  // console.log(values.join("\t"));
  return values[values.length-1];
}

module.exports = {
  siteName: 'Galaxy Community Hub: The Squeakquel',
  siteDescription: 'All about Galaxy and its community',
  templates: {
    Article: node => logAndReturn("Article", rmPathPrefix(node.path, 1)),
    Insert: node => logAndReturn("Insert", makeFilenamePath("insert", node)),
    Platform: node => logAndReturn("Platform", rmPathPrefix(node.path, 1)),
  },
  // Path globbing rules: https://www.npmjs.com/package/globby#user-content-globbing-patterns
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: ['content/**/index.md', '!content/use/*/index.md'],
        typeName: 'Article',
      }
    },
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: ['content/**/*.md', '!content/**/index.md'],
        typeName: 'Insert',
      }
    },
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: 'content/use/*/index.md',
        typeName: 'Platform',
      }
    },
  ],
  transformers: {
    // Add markdown support to all filesystem sources
    remark: {
      externalLinksTarget: '_blank',
      externalLinksRel: ['noopener', 'noreferrer'],
      slug: true,
      autolinkHeadings: true,
      plugins: ['remark-attr'],
    }
  },
}
