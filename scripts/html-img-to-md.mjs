/* This replaces raw `<img>` tags with Markdown `![image](syntax.jpg)`, preserving attributes and
 * styling as much as possible.
 */
import nodePath from 'path';
import unified from 'unified';
import rehypeParse from 'rehype-parse';
import hastUtilToHtml from 'hast-util-to-html';
import { visit } from 'unist-util-visit';

const htmlParser = unified().use(rehypeParse, {fragment:true});
const globals = {visits:0, limit:null};

export default function(options) {
  if (options === undefined) {
    options = {};
  }
  // Implement the Transformer interface:
  // https://github.com/unifiedjs/unified#function-transformernode-file-next
  function transformer(tree, file) {
    globals.limit = options.limit;
    globals.filePathRaw = file.path;
    if (options.base) {
      let filePath = getRelFilePath(file.cwd, globals.filePathRaw, options.base);
      globals.dirPath = nodePath.dirname(filePath);
    }
    visit(tree, 'html', replaceImgs);
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

function replaceImgs(rootNode, index, parent) {
  // `rootNode` is an `mdast` node of type `html`. Figure out if it contains an `<img>`.
  globals.visits++;
  if (globals.limit && globals.visits > globals.limit) {
    return;
  }
  let replacements = [];
  let html = rootNode.value;
  let dom = htmlParser.parse(html);
  let imgElems = findImgElems(dom);
  if (imgElems.length === 0) {
    return null;
  }
  //TODO: Sorting may not be necessary, but I'd have to verify that `findImgElems` always returns
  //      them in the right order.
  imgElems.sort((elem1, elem2) => elem1.position.start.offset - elem2.position.start.offset);
  let wrappedImgs = false;
  let lastImgEnd = 0;
  for (let imgElem of imgElems) {
    // If there's HTML before the `<img>`, cut it out and add it as a new node right before.
    // This could also be a bit of HTML in-between multiple `<img>`s.
    let fragment = html.slice(lastImgEnd, imgElem.position.start.offset);
    if (fragment !== '') {
      //TODO: Might want to include position information.
      //      That would be valid, since this is from the actual input document.
      replacements.push({type:'html', value:fragment});
    }
    // Replace the `<img>` itself with as many nodes as `convertImg()` decides is necessary.
    let imgElemReplacements = convertImg(imgElem);
    if (imgElemReplacements.length > 1) {
      wrappedImgs = true;
    }
    imgElemReplacements.forEach(node => replacements.push(node));
    lastImgEnd = imgElem.position.end.offset;
  }
  // If there's trailing HTML after the last `<img>`, add it as a node at the end.
  let fragment = html.slice(lastImgEnd);
  if (fragment !== '') {
    replacements.push({type:'html', value:fragment});
  }
  // Replace the original node with the new set of nodes.
  parent.children.splice(index, 1, ...replacements);
  /* If this line starts with an `<img>` (and isn't just `<img>`s), the replacement output
   * (single-line `<div>![](img)</div>`) will be parsed as a single `html` blob and the image
   * Markdown won't be parsed as Markdown.
   * This is avoided if there's any text (or inline HTML element) preceding the `<div>`. So here we
   * "fix" it by prepending a single, zero width space character.
   */
  if (
    imgElems[0].position.start.offset === 0 && index === 0 && parent.type === 'paragraph' &&
    parent.children.length > imgElems.length && wrappedImgs
  ) {
    parent.children.unshift({type:'text', value:'\u200b', leadingImageKludge:true});
  }
}

function findImgElems(elem) {
  // `elem` should be of type `element` or `root`. This does not check that.
  if (elem.tagName === 'img') {
    return [elem];
  } else {
    let imgElems = [];
    for (let child of elem.children) {
      if (child.type === 'element') {
        imgElems = imgElems.concat(findImgElems(child));
      }
    }
    return imgElems;
  }
}

function convertImg(img) {
  let divStart = makeImgWrapper(img);
  // See the mdast spec for representing Markdown nodes: https://github.com/syntax-tree/mdast#image
  let imgMd = {
    type: 'image',
    title: img.properties.title || null,
    url: fixSrc(img.properties.src),
    alt: img.properties.alt,
    // `position` intentionally omitted: it should not be included for generated nodes:
    // https://github.com/syntax-tree/unist#position
  };
  if (divStart) {
    let divEnd = {type: 'html', value: '</div>'};
    return [divStart, imgMd, divEnd];
  } else {
    return [imgMd];
  }
}


function makeImgWrapper(img) {
  let wrapperNeeded = false;
  // class
  let classes = ['img-sizer'];
  if (img.properties.className) {
    classes = classes.concat(img.properties.className);
    wrapperNeeded = true;
  }
  // align
  if (img.properties.align) {
    if (img.properties.align === 'right') {
      classes.push('float-right');
      wrapperNeeded = true;
    } else {
      console.error(`<img> found with unrecognized "align" property "${img.properties.align}"`);
    }
  }
  // width, height
  let styles = {};
  let width = translateCssDimension(img.properties.width);
  let height = translateCssDimension(img.properties.height);
  if (width) {
    styles['width'] = width;
    wrapperNeeded = true;
  }
  if (height) {
    styles['height'] = height;
    wrapperNeeded = true;
  }
  // style
  let styleStrs = [];
  if (img.properties.style) {
    //TODO: Double-check if any types of styles need special handling.
    styleStrs.push(img.properties.style);
  }
  if (Object.keys(styles).length > 0) {
    styleStrs.push(stringifyStyles(styles));
  }
  if (! wrapperNeeded) {
    return;
  }
  let wrapper = {
    type: 'element',
    tagName: 'div',
    properties: {
      className: classes,
    }
  }
  if (styleStrs.length > 0) {
    wrapper.properties.style = styleStrs.join(';');
  }
  let wrapperStrRaw = hastUtilToHtml(wrapper);
  // Remove the closing `</div>`.
  let wrapperStr = wrapperStrRaw.slice(0,wrapperStrRaw.length-6);
  return {'type':'html', value:wrapperStr};
}


function translateCssDimension(cssDimension) {
  if (cssDimension) {
    let [value, unit] = parseCssDimension(cssDimension);
    if (value) {
      return `${value}${unit}`;
    }
  }
}


function parseCssDimension(rawValue) {
  if (Number.isInteger(rawValue)) {
    return [rawValue, 'px'];
  }
  let value = parseInt(rawValue);
  let unit;
  if (isNaN(value)) {
    console.error(`Non-integer value found in CSS dimension ${JSON.stringify(rawValue)}`);
  } else {
    let intLen = String(value).length;
    unit = rawValue.slice(intLen).trim();
  }
  if (unit === '') {
    unit = 'px';
  } else if (! (unit === 'px' || unit === '%')) {
    console.error(`Unrecognized CSS unit ${JSON.stringify(unit)}`);
  }
  return [value, unit];
}


function stringifyStyles(styles) {
  let styleStrs = [];
  for (let [key, value] of Object.entries(styles)) {
    styleStrs.push(`${key}: ${value}`);
  }
  return styleStrs.join(';')
}


function fixSrc(rawSrc) {
  if (rawSrc.indexOf('http://') === 0 || rawSrc.indexOf('https://') === 0) {
    // External links
    return rawSrc;
  } else if (rawSrc.indexOf('/src/images') === 0) {
    // Links to the static directory.
    return rawSrc.slice(4);
  } else if (globals.dirPath) {
    // All other links.
    // Remove any `/src` prefix and find a relative path from this page to the image.
    let src;
    if (rawSrc.indexOf('/src/') === 0) {
      src = rawSrc.slice(4);
    } else {
      src = rawSrc;
    }
    let relSrc;
    if (nodePath.isAbsolute(src)) {
      relSrc = nodePath.relative('/'+globals.dirPath, src);
    } else {
      relSrc = src;
    }
    if (relSrc[0] !== '/' && relSrc[0] !== '.') {
      relSrc = './'+relSrc;
    }
    return relSrc;
  } else {
    // We don't know the url of this page. Just return the src as-is.
    return rawSrc;
  }
}
