// This is where project configuration and plugin options are located.
// Learn more: https://gridsome.org/docs/config

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

const nodePath = require('path');
const fs = require('fs');

const CONFIG = JSON.parse(fs.readFileSync('config.json','utf8'));

function mkTemplates(collections) {
  let templates = {
    Article: node => logAndReturn("Article", rmPathPrefix(node.path, 1)),
    Insert: node => logAndReturn("Insert", makeFilenamePath("insert", node)),
  };
  for (let name of Object.keys(collections)) {
    templates[name] = node => logAndReturn(name, rmPathPrefix(node.path, 1));
  }
  return templates;
}

function mkPlugins(collections) {
  // Path globbing rules: https://www.npmjs.com/package/globby#user-content-globbing-patterns
  let plugins = [
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
  ];
  for (let [name, urlPath] of Object.entries(collections)) {
    let globPath = nodePath.join('content', urlPath, '*/index.md');
    plugins[0].options.path.push('!'+globPath);
    let plugin = {
      use: '@gridsome/source-filesystem',
      options: {
        path: globPath,
        typeName: name,
      }
    };
    plugins.push(plugin);
  }
  return plugins;
}

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
  templates: mkTemplates(CONFIG['collections']),
  plugins: mkPlugins(CONFIG['collections']),
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
