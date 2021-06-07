#!/usr/bin/env node
import unified from 'unified';
import unifiedArgs from 'unified-args';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkStringify from 'remark-stringify';
import htmlImgToMd from './html-img-to-md.mjs';
import keepNewlineBeforeHtml from './keep-newline-before-html.mjs';

const REMARK_STRINGIFY_OPTIONS = {
  fences:true, rule:'-', listItemIndent:'one', setext:true,
  handlers: {break: _ => '  \n'}
};

// Note: unified-engine is made to make filesystem traversal easy:
//       https://github.com/unifiedjs/unified-engine
// Parse Markdown with remark-parse, parse the frontmatter, modify it with our plugins, then
// serialize it right back to Markdown with remark-stringify.
const processor = unified()
  .use(remarkParse)
  .use(keepNewlineBeforeHtml)
  .use(htmlImgToMd)
  .use(remarkFrontmatter, {type:'yaml', marker:'-'})
  .use(remarkStringify, REMARK_STRINGIFY_OPTIONS);


unifiedArgs({
  processor: processor,
  name: 'mdfixer',
  description: 'Fix Markdown.',
  version: 0.1,
  extensions: ['md'],
  ignoreName: '.mdfixer.ignore',
  rcName: '.mdfixerc',
  packageField: 'none',
  pluginPrefix: 'none',
});
