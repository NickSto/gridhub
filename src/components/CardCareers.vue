<template>
  <div class="card border-info">
    <div class="card-header">
      <Continent :continent="article.continent" />
      <a :href="article.external_url">{{ article.title }}</a>
    </div>
    <p class="location">
      <a :href="article.location_url">{{ article.location }}</a>
    </p>
    <p class="posted">
      Posted: {{ article.date }}
      <br>
      <span v-if="article.closes" class="text-warning">
        Apply by: {{ article.closes }}
      </span>
    </p>
    <p v-html="mdToHtml(article.summary)" />
    <p v-if="article.contact" class="contact">
      Contact: {{ article.contact }}
    </p>
    <p v-if="article.image">
      <a :href="article.external_url">
        <g-image class="card-img-bottom" :src="article.image.replace('/src','')" />
      </a>
    </p>
  </div>
</template>

<script>
import Continent from '@/components/Continent';
import { mdToHtml } from '~/utils.js';
export default {
  components: {
    Continent,
  },
  props: ["article"],
  methods: {
    mdToHtml,
  },
};
</script>

<style scoped>
.card {
  min-width: 14rem;
  max-width: 20rem;
}
.location, .posted {
  font-weight: bolder;
}
.contact {
  font-style: italic;
}
</style>