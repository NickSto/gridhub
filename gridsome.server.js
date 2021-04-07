// Server API makes it possible to hook into various parts of Gridsome
// on server-side and add custom data to the GraphQL data layer.
// Learn more: https://gridsome.org/docs/server-api/

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

const fs = require('fs');
const path = require('path');
const { imageType } = require('gridsome/lib/graphql/types/image');

const MEDIATED_DIR = 'src/mediated-pages';
const CONFIG = JSON.parse(fs.readFileSync('config.json','utf8'));

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

function dateToStr(date) {
  // Turn a `Date` object into a string like "2021-03-12".
  return date.toISOString().slice(0,10);
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
    if (file !== result.name+result.ext) {
      console.error(`Error: ${file} !== ${result.name+result.ext}`);
      continue
    }
    images[file] = imgData;
  }
  return images;
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
        hasDate: Boolean
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
  api.onCreateNode(options => {
    let exclude = false;
    let pathParts = options.path.split("/");
    options.filename = options.fileInfo.name;
    // Articles
    if (options.internal.typeName === "Article") {
      // Categorize by path.
      options.category = categorize(pathParts);
      if (options.filename !== 'index') {
        console.error(`Non-index.md Article encountered: ${options.path}`);
        exclude = true;
      }
    } else if (options.internal.typeName === "Platform") {
      if (options.filename !== 'index') {
        exclude = true;
      }
    }
    // Label ones with dates.
    // This gets around the inability of the GraphQL schema to query on null/empty dates.
    if (options.date) {
      options.hasDate = true;
    } else {
      options.hasDate = false;
    }
    if (exclude) {
      console.log(`Excluding ${options.path}`);
      return null;
    } else {
      return options;
    }
  });

  api.createPages(({ createPage }) => {
    // Using the Pages API: https://gridsome.org/docs/pages-api/
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear()-1, now.getMonth(), now.getDate());
    const todayStr = dateToStr(now);
    const oneYearAgoStr = dateToStr(oneYearAgo);
    // The context variables every mediated page receives:
    const context = {
      today: todayStr,
      oneYearAgo: oneYearAgoStr,
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
