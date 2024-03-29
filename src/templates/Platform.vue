<template>
  <Layout>
    <g-link to="/use/" class="link"> &larr; Platform Directory</g-link>
    <header>
      <h1 class="pageTitle">{{ $page.platform.title }}</h1>
    </header>
    <div class="float-right image-box">
      <a :href="$page.platform.url">
        <g-image v-if="$page.platform.image" class="img-responsive"
          :src="getImage($page.platform.image)" />
        <template v-else>{{ $page.platform.title }}</template>
      </a>
    </div>
    <table class="table table-striped summary">
      <tbody>
        <tr v-for="platform of $page.platform.platforms">
          <th>{{ groupNames.get(platform.platform_group) }}:</th>
          <td><a :href="platform.platform_url">{{ platform.platform_text }}</a></td>
        </tr>
        <tr>
          <th>Scope:</th>
          <td>
            <a :href="`/use/#${$page.platform.scope}`">{{ scopeNames.get($page.platform.scope) }}</a>
          </td>
        </tr>
        <tr>
          <th>Summary:</th>
          <td class="markdown" v-html="mdToHtml($page.platform.summary)" />
        </tr>
      </tbody>
    </table>
    <template v-for="series of serieses">
      <h2 :key="series.name+':h2'">{{ series.name }}</h2>
      <ul :key="series.name+':ul'">
        <li class="markdown" v-for="item in series.values" :key="item" v-html="item" />
      </ul>
    </template>
  </Layout>
</template>

<page-query>
query Platform($path: String!) {
   platform(path: $path) {
    id
    title
    url
    image
    images
    platforms {
      platform_group
      platform_url
      platform_text
    }
    scope
    summary
    comments
    user_support
    quotas
    citations
    sponsors
  }
}
</page-query>

<script>
import { mdToHtml, titlecase, getImage } from '~/utils.js';
export default {
  metaInfo() {
    return {
      title: this.$page.platform.title,
    }
  },
  methods: {
    mdToHtml,
    getImage(imagePath) {
      return getImage(imagePath, this.$page.platform.images);
    }
  },
  data() {
    return {
      groupNames: new Map([
        ["public-server", "Public server"],
        ["commercial-cloud", "Commercial Cloud"],
        ["academic-cloud", "Academic Cloud"],
        ["container", 'Container'],
        ["vm", 'Virtual Machine'],
      ]),
      scopeNames: new Map([
        ["usegalaxy", "UseGalaxy server"],
        ["general", "Genomics"],
        ["domain", "Domain specific"],
        ["tool-publishing", "Tool Publishing"],
      ]),
    };
  },
  computed: {
    serieses() {
      let serieses = [];
      for (let key of ['comments', 'user_support', 'quotas', 'citations', 'sponsors']) {
        let series = {
          values: this.$page.platform[key].map(mdToHtml),
          name: key.split('_').map(titlecase).join(' '),
        }
        serieses.push(series);
      }
      return serieses;
    }
  }
}
</script>

<style scoped>
.image-box {
  margin: 0px 0px 5px 10px;
  padding: 2px;
  border: 1px solid #ccc;
}
.image-box img {
  max-width: 100%;
}
table.summary {
  width: auto;
}
</style>
