/* This replaces raw `<img>` tags with Markdown `![image](syntax.jpg)`, preserving attributes and
 * styling as much as possible.
 */
import unified from 'unified';
import rehypeParse from 'rehype-parse';
import { visit } from 'unist-util-visit';

const htmlParser = unified().use(rehypeParse, {fragment:true});

export default function(options) {
  // Implement the Transformer interface:
  // https://github.com/unifiedjs/unified#function-transformernode-file-next
  function transformer(tree, file) {
    visit(tree, 'html', replaceIfImg);
  }
  return transformer
}

function replaceIfImg(node, index, parent) {
  for (let i = 0; i < parent.children.length; i++) {
    let child = parent.children[i];
    let img = parseImg(child);
    if (img) {
      console.log('Found <img>:');
      for (let [key, value] of Object.entries(img.properties)) {
        console.log(`  ${key}:\t${value}`);
      }
      let replacements = convertImg(img);
      parent.children.splice(i, 1, ...replacements);
    }
  }
}

function parseImg(node) {
  if (node.type === 'html') {
    let dom = htmlParser.parse(node.value);
    if (dom.children.length > 0 && dom.children[0].tagName === 'img') {
      return dom.children[0];
    }
  }
}

function convertImg(img) {
  //TODO: Transfer all properties to the <div> appropriately.
  //TODO: Use an actual HTML library to create the HTML text instead of string templates.
  //TODO: Simple images don't actually need to be wrapped. Just emit a simple Markdown image if
  //      there aren't any special properties that need to be in a <div> wrapper.
  let divStart = {
    type: 'html',
    value: '<div>'
  };
  // See the mdast spec for representing Markdown nodes: https://github.com/syntax-tree/mdast
  let imgMd = {
    type: 'image',
    title: img.properties.title || null,
    url: img.properties.src,
    alt: img.properties.alt,
    // `position` should not be included for generated nodes:
    // https://github.com/syntax-tree/unist#position
  };
  let divEnd = {
    type: 'html',
    value: '</div>'
  };
  return [divStart, imgMd, divEnd];
}
