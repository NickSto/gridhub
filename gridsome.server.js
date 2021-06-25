// Server API makes it possible to hook into various parts of Gridsome
// on server-side and add custom data to the GraphQL data layer.
// Learn more: https://gridsome.org/docs/server-api/

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

const fs = require('fs');
const path = require('path');
const { imageType } = require('gridsome/lib/graphql/types/image');
const { repr, rmPrefix, rmSuffix, dateToStr, dateStrDiff, matchesPrefixes } = require('./src/utils');

const CONFIG = JSON.parse(fs.readFileSync('config.json','utf8'));
const COMPILE_DATE = dateToStr(new Date());
const IMAGE_REGISTRY = new Set();
const IMAGE_PREFIX_WHITELIST = ['images/', 'https://', 'http://'];

function categorize(pathParts) {
  /** Take a `pathParts` made by splitting the path on `"/"` and return a category:
   *  ```
   *  let path = "/events/2017-02-globus/"
   *  let pathParts = path.split("/")        // [ "", "events", "2017-02-globus", "" ]
   *  let category = categorize(pathParts)   // "events"
   *  ```
   */
  //TODO: Allow trailing slashes in category paths.
  let keyParts = pathParts.slice(0, pathParts.length-2);
  let key = keyParts.join("/");
  let category = CONFIG['categories'][key];
  if (category === undefined) {
    return null;
  } else {
    return category;
  }
}

function findInsertsInMarkdown(content) {
  /** Parse Markdown content and extract the names of all inserts in `<slot>`s. */
  //TODO: Replace this monstrosity with actual Markdown parsing.
  //      Or do this in the preprocessing steps where we parse it all anyway.
  //      Could just add an "inserts" key to the yaml header.
  let matches = Array.from(content.matchAll(/<slot\s*name=["']?([^"']+)["']?\s*\/?>/ig));
  return matches.map(match => match[1]);
}

// Based on https://github.com/gridsome/gridsome/issues/292#issuecomment-483347365
async function resolveImages(node, args, context, info) {
  /** Add any image found in the `image` metadata key to the asset store. */
  if (! node.image) {
    return {};
  }
  let buildDir;
  if (node.internal.typeName === 'VueArticle') {
    buildDir = path.join(__dirname, CONFIG.build.dirs.vue);
  } else {
    buildDir = path.join(__dirname, CONFIG.build.dirs.md);
  }
  let dirPath = path.join(buildDir, node.path);
  if (! fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return {};
  }
  let relImgPath = rmPrefix(rmPrefix(node.image, '/src'), '/');
  // Images in the static directory are already available by default.
  // They don't need to be added to the asset store.
  // Also, external images obviously don't need to be added.
  if (matchesPrefixes(relImgPath, IMAGE_PREFIX_WHITELIST)) {
    return {};
  }
  let candidates = [
    path.join(dirPath, relImgPath),
    path.join(buildDir, relImgPath),
  ];
  let imgPath;
  for (let candidate of candidates) {
    if (fs.existsSync(candidate)) {
      imgPath = candidate;
    }
  }
  if (! imgPath) {
    console.error(repr`Image not found: ${node.image}`);
    return {};
  }
  let relImgPathFromContent = path.relative(buildDir, imgPath);
  if (IMAGE_REGISTRY.has(relImgPathFromContent)) {
    console.log(repr`Image ${relImgPathFromContent} already in asset store.`);
  }
  let images = addImage(imgPath, args, context);
  if (images) {
    IMAGE_REGISTRY.add(relImgPathFromContent);
    return images;
  } else {
    return {};
  }
}

async function addImage(imgPath, args, context) {
  let images = {};
  let filename = path.basename(imgPath);
  let result;
  try {
    result = await context.assets.add(imgPath, args);
  } catch (error) {
    console.error(error);
    return null;
  }
  let imgData = {};
  for (let attr of ['type', 'mimeType', 'src', 'size', 'sizes', 'srcset', 'dataUri']) {
    imgData[attr] = result[attr];
  }
  if (result.type !== 'image') {
    let fileType = result.mimeType || 'non-image';
    console.log(`Saw ${fileType} ${repr(filename)}`);
    if (result.type !== 'file') {
      console.error(repr`  result.type for ${filename} is ${result.type}`);
    }
    return null;
  }
  if (filename !== result.name+result.ext) {
    console.error(repr`Error: ${filename} !== ${result.name+result.ext}`);
    return null;
  }
  images[filename] = imgData;
  return images;
}

class nodeModifier {
  static processNewNode(node, collection, typeName) {
    if (this.collectionProcessors[typeName]) {
      node = this.collectionProcessors[typeName](node, collection);
    }
    if (node === null) {
      return node;
    }
    if (typeName !== 'Insert') {
      node = this.processNonInsert(node, collection);
    }
    return node;
  }
  static processNonInsert(node) {
    if (node.filename !== 'index') {
      // All Markdown files should be named `index.md`, unless it's an `Insert`.
      // `vue-remark` doesn't offer enough filtering to exclude non-index.md files from collection
      // configurations, so we have to exclude them here.
      return null;
    }
    // Label ones with dates.
    // This gets around the inability of the GraphQL schema to query on null/empty dates.
    if (node.date) {
      node.days_ago = dateStrDiff(COMPILE_DATE, node.date);
      node.has_date = true;
    } else {
      node.has_date = false;
    }
    return node;
  }
  static collectionProcessors = {
    Article: function(node) {
      // Categorize by path.
      let pathParts = node.path.split("/");
      node.category = categorize(pathParts);
      if (node.category === 'careers') {
        if (node.closes && dateStrDiff(COMPILE_DATE, node.closes) > 0) {
          node.closed = true;
        } else {
          node.closed = false;
        }
      }
      return node;
    },
    VueArticle: function(node, collection) {
      // Find and link Inserts.
      // Note: `._store` is technically not a stable API, but it's unlikely to go away and there's
      // almost no other way to do this.
      const store = collection._store;
      const insertCollection = store.getCollection('Insert');
      node.inserts = [];
      for (let insertName of findInsertsInMarkdown(node.content)) {
        let path = `/insert:${insertName}/`;
        let insert = insertCollection.findNode({path:path});
        if (insert) {
          node.inserts.push(store.createReference(insert));
        } else {
          console.error(repr`Failed to find Insert for path ${path}`);
        }
      }
      return node;
    },
    Insert: function(node) {
      node.name = rmSuffix(rmPrefix(node.path,'/insert:'),'/');
      return node;
    },
  }
}

module.exports = function(api) {
  api.loadSource(actions => {
    // Using the Data Store API: https://gridsome.org/docs/data-store-api/
    // Add derived `category` field.
    /*TODO: Replace this and the later api.onCreateNode() call with this technique instead:
     *      https://gridsome.org/docs/schema-api/#add-a-new-field-with-a-custom-resolver
     *      This currently causes problems because a bug prevents you from filtering based on fields
     *      added this way: https://github.com/gridsome/gridsome/issues/1196
     *      This is supposed to be fixed by Gridsome 1.0.
     */
    actions.addSchemaTypes(`
      type Article implements Node @infer {
        category: String
        has_date: Boolean
        days_ago: Int
        closed: Boolean
      }
    `);
    let collections = (['Article', 'VueArticle']).concat(Object.keys(CONFIG['collections']));
    let schemas = {};
    for (let collection of collections) {
      schemas[collection] = {
        images: {
          type: imageType.type,
          args: imageType.args,
          resolve: resolveImages,
        }
      };
    }
    actions.addSchemaResolvers(schemas);
  });

  // Populate the derived fields.
  api.onCreateNode((node, collection) => {
    let typeName = node.internal.typeName;
    node.filename = node.fileInfo.name;
    return nodeModifier.processNewNode(node, collection, typeName);
  });
}
