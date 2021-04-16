<template>
  <div class="layout">
    <header id="masthead">
      <NavBar/>
    </header>
    <section id="maincontainer" class="container">
      <slot/>
      <footer class="static-footer" v-if="$static.footer" v-html="$static.footer.content" />
    </section>
  </div>
</template>

<script>
import NavBar from '@/components/NavBar';
export default {
  components: {
    NavBar,
  },
}
</script>

<static-query>
query {
  metadata {
    siteName
  }
  footer: insert(path: "/insert:/site-footer/") {
    id
    title
    content
  }
}
</static-query>

<style>
.text-nowrap {
  white-space: nowrap !important;
}
</style>