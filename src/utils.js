
const remark = require('remark');
const remarkHtml = require('remark-html');
const util = require('util');

export function slugify(string) {
  return string.toLowerCase().replace(/[^\w\d -]/g, '').replace(/[ -]+/g,'-');
}

export function ensurePrefix(string, char) {
  if (string.startsWith(char)) {
    return string;
  } else {
    return char+string;
  }
}

export function getImage(imagePath, images) {
  if (! imagePath) {
    return null;
  }
  if (startswith(imagePath,"/src/images/")) {
    return imagePath.substring(4);
  } else if (startswith(imagePath,"/images/")) {
    return imagePath;
  }
  let fields = imagePath.split("/");
  let filename = fields[fields.length-1];
  return images[filename];
}

export function mdToHtml(md) {
  let rawHtml;
  remark().use(remarkHtml).process(md, (err, file) => {
    if (err) {
      console.error(err);
    } else {
      rawHtml = String(file);
    }
  });
  return rmPrefix(rmSuffix(rawHtml.trim(),'</p>'),'<p>');
}

export function rmPrefix(rawString, prefix) {
  if (rawString.indexOf(prefix) === 0) {
    return rawString.slice(prefix.length);
  } else {
    return rawString;
  }
}

export function rmSuffix(rawString, suffix) {
  let suffixIndex = rawString.length - suffix.length;
  if (rawString.slice(suffixIndex) === suffix) {
    return rawString.slice(0, suffixIndex);
  } else {
    return rawString;
  }
}

export function startswith(string, query) {
  return string.indexOf(query) === 0;
}

export function endswith(string, query) {
  return string.indexOf(query) === string.length - query.length;
}

export function titlecase(rawString) {
  return rawString.charAt(0).toUpperCase() + rawString.substring(1, rawString.length);
}

export function spaceTab(rawStr, tabWidth=8) {
  /** Create the same effect as adding a tab to the string, except use spaces. */
  let tabStop = tabWidth*(1+Math.floor(rawStr.length/tabWidth));
  return rawStr.padEnd(tabStop);
}

export function describeObject(obj, indent='', maxWidth=100) {
  for (let [name, value] of Object.entries(obj)) {
    let type = typeof value;
    let valueStr;
    if (type === 'string') {
      valueStr = util.inspect(value);
    } else if (type === 'number' || type === 'boolean' || value === null) {
      valueStr = value;
    } else {
      valueStr = `(${type})`;
    }
    let nameStr = spaceTab(name+':')
    let rawLine = `${indent}${nameStr}${valueStr}`;
    let line;
    if (rawLine.length > maxWidth) {
      line = rawLine.substring(0,maxWidth-1) + '…';
    } else {
      line = rawLine;
    }
    console.log(line);
  }
}

export function logTree(root, depth, indent) {
  let idStr = "";
  if (root.id) {
    idStr = ` id="${root.id}`;
  }
  let classStr = "";
  if (root.className) {
    classStr = ` class="${root.className}"`;
  }
  console.log(`${indent}<${root.tagName.toLowerCase()}${idStr}${classStr}>`);
  depth -= 1
  indent = "  "+indent;
  if (depth > 0) {
    root.children.forEach(child => logTree(child, depth, indent));
  } else {
    console.log(`${indent}  (recursion limit)`);
  }
}
