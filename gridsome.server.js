// Server API makes it possible to hook into various parts of Gridsome
// on server-side and add custom data to the GraphQL data layer.
// Learn more: https://gridsome.org/docs/server-api/

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

const fs = require('fs');
const path = require('path');
const { imageType } = require('gridsome/lib/graphql/types/image');
const { rmPrefix, rmSuffix, dateToStr, dateStrDiff } = require('./src/utils');

const MEDIATED_DIR = 'src/mediated-pages';
const CONFIG = JSON.parse(fs.readFileSync('config.json','utf8'));
const COMPILE_DATE = dateToStr(new Date());

function getFilesDeep(rootDir) {
  /**
   * Find all the children of `rootDir`.
   * Arguments:
   *   `rootDir` (`String`): An absolute or relative path of a directory.
   * Returns:
   *   `files` (`Array`): An array of paths relative to the same directory as the `rootDir`.
   *     Returns only the paths to files (tested by `isFile()`).
   */
  let files = [];
  let children = fs.readdirSync(rootDir, {withFileTypes: true});
  for (let child of children) {
    let childPath = path.join(rootDir,child.name)
    if (child.isDirectory()) {
      let descendents = getFilesDeep(childPath);
      files = files.concat(descendents);
    } else if (child.isFile()) {
      files.push(childPath);
    }
  }
  return files;
}

function getFilesShallow(dirPath, excludeExt=null) {
  let files = [];
  let children = fs.readdirSync(dirPath, {withFileTypes: true});
  for (let child of children) {
    if (child.isFile()) {
      if (excludeExt === null || path.parse(child.name).ext !== excludeExt) {
        files.push(child.name);
      }
    }
  }
  return files;
}

function fsPathToUrlPath(fsPath) {
  if (fsPath.indexOf(MEDIATED_DIR) !== 0) {
    throw `${fsPath} does not start with ${MEDIATED_DIR}`;
  }
  let relativePath = fsPath.slice(MEDIATED_DIR.length);
  let pathParts = path.parse(relativePath);
  if (pathParts.ext !== ".vue") {
    throw `${fsPath} does not end in '.vue'`;
  }
  let end = pathParts.name.toLowerCase()+"/";
  if (pathParts.name === 'Index') {
    end = "";
  }
  return path.join(pathParts.dir,end);
}

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
  let matches = Array.from(content.matchAll(/<slot\s*name=["']?([^"']+)["']?\s*\/>/ig));
  return matches.map(match => match[1]);
}

// Based on https://github.com/gridsome/gridsome/issues/292#issuecomment-483347365
/*TODO: Could actually parse the graymatter and add any images from there, no matter where
 *      they're located. Just take anything that looks like a path and check if it exists.
 *      This would be more parsimonious, avoiding adding images in the directory but not actually
 *      used, or ones already in the build b/c of a Markdown reference.
 */
async function resolveImages(node, args, context, info) {
  let images = {};
  let dirPath = path.join(__dirname, CONFIG.contentDir, node.path);
  if (! fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return images;
  }
  let files = getFilesShallow(dirPath, excludeExt='.md');
  for (let file of files) {
    let imgPath = path.join(dirPath, file);
    let result;
    try {
      result = await context.assets.add(imgPath, args);
    } catch (error) {
      console.error(error);
      continue;
    }
    let imgData = {};
    for (let attr of ['type', 'mimeType', 'src', 'size', 'sizes', 'srcset', 'dataUri']) {
      imgData[attr] = result[attr];
    }
    if (result.type !== 'image') {
      let filename = path.parse(result.filePath).base;
      let fileType = result.mimeType || 'non-image';
      console.log(`Saw ${fileType} "${filename}"`);
      if (result.type !== 'file') {
        console.error(`  result.type for "${filename}" is "${result.type}"`);
      }
      continue
    }
    if (file !== result.name+result.ext) {
      console.error(`Error: ${file} !== ${result.name+result.ext}`);
      continue
    }
    images[file] = imgData;
  }
  return images;
}

function processNonInsert(node, collection) {
  if (node === null) {
    return node;
  }
  if (node.filename !== 'index') {
    // All Markdown files should be named `index.md`, unless it's an `Insert`.
    // `vue-remark` doesn't offer enough filtering to exclude non-index.md files from collection
    // configurations, so we have to exclude them here.
    let relPath = rmPrefix(node.internal.origin, __dirname+"/");
    console.log(`Excluding from ${node.internal.typeName}s: ${relPath}`);
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
  // Find and link Inserts.
  // Note: This is technically not a stable API, but it's unlikely to go away and there's almost no
  // other way to do this.
  const store = collection._store;
  const insertCollection = store.getCollection('Insert');
  node.inserts = [];
  for (let insertName of findInsertsInMarkdown(node.content)) {
    let path = `/insert:${insertName}/`;
    let insert = insertCollection.findNode({path:path});
    if (insert) {
      node.inserts.push(store.createReference(insert));
    } else {
      console.error(`Failed to find Insert for path "${path}"`);
    }
  }
  return node;
}

function processArticle(node, collection) {
  if (node === null) {
    return node;
  }
  // Categorize by path.
  let pathParts = node.path.split("/");
  node.category = categorize(pathParts);
  return node;
}

function processInsert(node, collection) {
  if (node === null) {
    return node;
  }
  node.name = rmSuffix(rmPrefix(node.path,'/insert:'),'/');
  return node;
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
      }
    `);
    let collections = (['Article']).concat(Object.keys(CONFIG['collections']));
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
    // Everything except Inserts
    if (typeName !== 'Insert') {
      node = processNonInsert(node, collection);
    }
    // Articles
    if (typeName === 'Article') {
      node = processArticle(node, collection);
    // Inserts
    } else if (typeName === 'Insert') {
      node = processInsert(node, collection);
    }
    return node;
  });

  api.createPages(({ createPage }) => {
    // Using the Pages API: https://gridsome.org/docs/pages-api/
    // The context variables every mediated page receives:
    const context = {
      today: COMPILE_DATE,
    };
    getFilesDeep(MEDIATED_DIR).forEach(filePath => {
      createPage({
        path: fsPathToUrlPath(filePath),
        component: filePath,
        context: context,
      });
    });
  })
}
