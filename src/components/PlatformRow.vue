<template>
  <tr>
    <td class="title">
      <a :href="platform.path">{{ platform.title }}</a>
    </td>
    <td class="server">
      <a :href="platform.url">Server</a>
    </td>
    <td class="summary" v-html="mdToHtml(platform.summary)" />
  </tr>
</template>

<script>
import { mdToHtml } from '~/utils.js';
export default {
  props: ["platform"],
  methods: {
    mdToHtml,
  },
};
</script>
