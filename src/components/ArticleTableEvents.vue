<template>
  <tr>
    <td class="date text-nowrap">{{ article.date }}</td>
    <td class="title">
      <a v-if="article.external_url" :href="article.external_url">{{ article.title }}</a>
      <g-link v-else :to="article.path" class="read">{{ article.title }}</g-link>
      <p class="tease">{{ article.tease }}</p>
    </td>
    <td class="location">
      <Continent :continent="article.continent" />
      <a v-if="article.location_url" :href="article.location_url">{{ article.location }}</a>
      <template v-else>{{ article.location }}</template>
    </td>
    <td class="contact">
      <a v-if="article.gtn" href="https://training.galaxyproject.org/">
        <g-image class="gtn-icon" src="/images/galaxy-logos/GTN16.png" alt="Training offered by GTN Member" title="Training offered by GTN Member"/>
      </a>
      {{ article.contact }}
    </td>
  </tr>
</template>

<script scoped>
import Continent from '@/components/Continent';
export default {
  components: {
    Continent,
  },
  props: ["article"],
};
</script>

<style scoped>
.gtn-icon {
  float: right;
}
</style>
