/** Fix the links in Markdown `![](images.jpg)` and `[hyper](links)`, and HTML `<img>`s and `<a>`s
 *  - Remove `/src` prefixes.
 *  - Remove `index.md` suffixes.
 *  - Make image links relative to the current directory.
 */

import nodePath from 'path';
import unified from 'unified';
import rehypeParse from 'rehype-parse';
import hastUtilToHtml from 'hast-util-to-html';
import { visit } from "unist-util-visit";
import { rmPrefix, rmSuffix } from '../src/utils.js';

const htmlParser = unified().use(rehypeParse, {fragment:true, verbose:true});
const globals = {};
// Prefixes that denote that the path is absolute and does not need altering.
//TODO: How about urls that begin with a domain but no protocol?
const PREFIX_WHITELIST = ['http://', 'https://', 'mailto:', '/images/', '//', '#'];
const DUMMY_DOMAIN = 'http://dummy.test';

export default function(options) {
  if (options === undefined) {
    options = {};
  }
  globals.debug = options.debug
  // Implement the Transformer interface:
  // https://github.com/unifiedjs/unified#function-transformernode-file-next
  function transformer(tree, file) {
    // console.log(`Cwd:  ${file.cwd}`);
    // console.log(`Path: ${file.path}`);
    // console.log(`Base: ${options.base}`);
    globals.filePathRaw = file.path;
    if (options.base) {
      let filePath = getRelFilePath(file.cwd, globals.filePathRaw, options.base);
      globals.dirPath = nodePath.dirname(filePath);
    }
    // console.log(`Found file dirname ${globals.dirPath}`);
    visit(tree, 'link', node => { node.url = fixHyperLink(node.url) });
    visit(tree, 'image', node => { node.url = fixImageLink(node.url) });
    visit(tree, 'html', fixHtmlLinks);
  }
  return transformer
}

function getRelFilePath(cwd, rawPath, base) {
  // Get the path to the file at `rawPath` relative to the root directory `base`.
  if (nodePath.isAbsolute(base)) {
    let absPath = nodePath.join(cwd, rawPath);
    return nodePath.relative(base, absPath);
  } else {
    return nodePath.relative(base, rawPath);
  }
}

function fixHtmlLinks(node, index, parent) {
  let dom = htmlParser.parse(node.value);
  fixImgElemLinks(dom);
  fixAElemLinks(dom);
  node.value = hastUtilToHtml(dom);
}

function fixAElemLinks(dom) {
  /** Fix all the `href` urls in all `<a>` elements in the given `hast` tree. */
  let aElems = getElementsByTagName(dom, 'a');
  for (let aElem of aElems) {
    if (aElem.properties.href) {
      aElem.properties.href = fixHyperLink(aElem.properties.href);
    }
  }
}

function fixImgElemLinks(dom) {
  /** Fix all the `src` urls in all `<img>` elements in the given `hast` tree. */
  let imgElems = getElementsByTagName(dom, 'img');
  for (let imgElem of imgElems) {
    if (imgElem.properties.src) {
      imgElem.properties.src = fixImageLink(imgElem.properties.src);
    }
  }
}

function getElementsByTagName(elem, tagName) {
  /** Find all the elements of a given type in a `hast` tree rooted at `elem`.
   * NOTE: `elem` should be of type `element` or `root`. This does not check that.
   */
  if (elem.tagName === tagName) {
    return [elem];
  } else {
    let results = [];
    for (let child of elem.children) {
      if (child.type === 'element') {
        results = results.concat(getElementsByTagName(child, tagName));
      }
    }
    return results;
  }
}

function fixHyperLink(rawUrl) {
  /** Perform all the editing appropriate for a hyperlink url (whether in HTML or Markdown). */
  // Full parsing is needed to take care of situations like a trailing url #fragment.
  let urlObj = new URL(rawUrl, DUMMY_DOMAIN);
  urlObj.pathname = rmSuffix(rmPrefix(urlObj.pathname, '/src'), 'index.md');
  let url = rmPrefix(urlObj.href, DUMMY_DOMAIN);
  if (globals.debug) {
    if (url === rawUrl) {
      console.log(`Link:  Kept ${url}`);
    } else {
      console.log(`Link:  Edited ${rawUrl} to ${url}`);
    }
  }
  return url;
}

function fixImageLink(rawPath) {
  /** Perform all the editing appropriate for an image src url (whether in HTML or Markdown). */
  let path = rmPrefix(rawPath, '/src');
  if (globals.dirPath) {
    path = toRelImagePath(globals.dirPath, path, PREFIX_WHITELIST);
  }
  if (globals.debug) {
    if (rawPath === path) {
      console.log(`Image: Kept ${path}`);
    } else {
      console.log(`Image: Edited ${rawPath} to ${path}`);
    }
  }
  return path;
}

function toRelImagePath(src, dst, whitelist) {
  for (let prefix of whitelist) {
    if (dst.indexOf(prefix) === 0) {
      return dst;
    }
  }
  // Find a relative path from this page to the image.
  let relPath;
  if (nodePath.isAbsolute(dst)) {
    relPath = nodePath.relative('/'+src, dst);
  } else {
    relPath = dst;
  }
  if (relPath[0] !== '/' && relPath[0] !== '.') {
    relPath = './'+relPath;
  }
  return relPath;
}