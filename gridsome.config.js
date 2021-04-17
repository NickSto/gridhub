// This is where project configuration and plugin options are located.
// Learn more: https://gridsome.org/docs/config

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

const nodePath = require('path');
const fs = require('fs');
const { rmPrefix, rmSuffix, rmPathPrefix } = require('./src/utils.js');

const CONFIG = JSON.parse(fs.readFileSync('config.json','utf8'));

function mkPlugins(collections) {
  // Path globbing rules: https://www.npmjs.com/package/globby#user-content-globbing-patterns
  let plugins = [
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: [CONFIG.contentDir+'/**/*.md', '!'+CONFIG.contentDir+'/**/index.md'],
        typeName: 'Insert',
      }
    },
    {
      use: '@gridsome/vue-remark',
      options: {
        typeName: 'Article',
        baseDir: CONFIG.contentDir,
        pathPrefix: '/',
        ignore: [],
        template: 'src/templates/Article.vue'
      }
    },
  ];
  for (let [name, urlPath] of Object.entries(collections)) {
    let dirPath = nodePath.join(CONFIG.contentDir, urlPath);
    plugins[1].options.ignore.push(nodePath.join(rmPrefix(rmSuffix(urlPath,'/'),'/')));
    let plugin = {
      use: '@gridsome/vue-remark',
      options: {
        typeName: name,
        baseDir: dirPath,
        pathPrefix: urlPath,
        ignore: [getIgnorePath(urlPath)],
        template: nodePath.join('src/templates', name+'.vue')
      }
    };
    plugins.push(plugin);
  }
  return plugins;
}

function getIgnorePath(urlPath) {
  // Take the path for a collection and return the path for the plugin's `ignore` key.
  // E.g. '/use/' -------> '*/*/**/*.md'
  //      '/help/faqs/' -> '*/*/*/**/*.md'
  // This ignore path makes sure only pages directly under the `urlPath` are included in the
  // collection.
  let depth = urlPath.split(nodePath.sep).length - 2;
  return nodePath.join('*/', '*/'.repeat(depth), '**/*.md');
}

function makeFilenamePath(prefix, node) {
  let directory = rmPathPrefix(node.fileInfo.directory, 1, absolute=false);
  let path;
  if (directory === "") {
    path = node.fileInfo.name;
  } else {
    path = [directory, node.fileInfo.name].join("/");
  }
  return `/${prefix}:/${path}`;
}

function logAndReturn(...values) {
  // console.log(values.join("\t"));
  return values[values.length-1];
}

module.exports = {
  siteName: 'Galaxy Community Hub: The Squeakquel',
  siteDescription: 'All about Galaxy and its community',
  templates: {
    Insert: node => logAndReturn("Insert", makeFilenamePath("insert", node)),
  },
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
  // This was required to solve an error thrown by importing `fs` into `src/util.js`.
  // https://github.com/nuxt-community/dotenv-module/issues/11#issuecomment-619958699
  configureWebpack: {
    node: {
      fs: "empty"
    }
  },
}
