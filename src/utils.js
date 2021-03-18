
const remark = require('remark');
const remarkHtml = require('remark-html');

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

export function titlecase(rawString) {
  return rawString.charAt(0).toUpperCase() + rawString.substring(1, rawString.length);
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
