<template>
  <tr>
    <td class="title">
      <a :href="platform.path">{{ platform.title }}</a>
    </td>
    <td class="server">
      <a :href="platform.url">Server</a>
    </td>
    <td class="summary" v-html="summary" />
  </tr>
</template>

<script>
const remark = require('remark');
const remarkHtml = require('remark-html');
export default {
  props: ["platform"],
  data() {
    let data = {};
    remark().use(remarkHtml).process(this.platform.summary, (err, file) => {
      if (err) {
        console.error(err);
      } else {
        data.summary = String(file);
      }
    });
    return data;
  }
};
</script>
