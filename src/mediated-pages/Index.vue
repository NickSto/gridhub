<template>
  <Layout>

    <header class="header">
      <h1 class="display-4">{{ $page.main.title }}</h1>
    </header>

    <section class="section-content">
      <div id="splash-row">
        <div class="col-sm-12" v-html="$page.main.content" />
      </div>

      <div class="row">
        <div class="col-sm-4">
          <h2><g-link to="/news/">News</g-link></h2>
          <ArticleListBrief v-for="edge in $page.news.edges" :key="edge.node.id" :article="edge.node" />
        </div>
        <div class="col-sm-4">
          <h2><g-link to="/events/">Events</g-link></h2>
          <ArticleListBrief v-for="edge in $page.events.edges" :key="edge.node.id" :article="edge.node" />
        </div>
        <div class="col-sm-4">
          <h2><g-link to="/blog/">Blog</g-link></h2>
          <ArticleListBrief v-for="edge in $page.blog.edges" :key="edge.node.id" :article="edge.node" />
        </div>
      </div>
    </section>

    <footer class="page-footer" v-if="$page.footer" v-html="$page.footer.content" />

  </Layout>
</template>

<script>
import ArticleListBrief from '@/components/ArticleListBrief';
export default {
  components: {
    ArticleListBrief,
  },
  metaInfo: {
    title: 'Home',
  },
};
</script>

<page-query>
query ($today: Date!) {
  main: insert (path: "/insert:/main/") {
    id
    title
    content
  }
  footer: insert (path: "/insert:/footer/") {
    id
    title
    content
  }
  news: allArticle(limit: 5, filter: { category: { eq: "news" }}) {
    totalCount
    edges {
      node {
        id
        title
        tease
        external_url
        path
      }
    }
  }
  events: allArticle(
      limit: 5, sortBy: "date", order: ASC,
      filter: { category: { eq: "events" }, date: { gte: $today } }
    ) {
    totalCount
    edges {
      node {
        id
        title
        tease
        external_url
        path
      }
    }
  }
  blog: allArticle(limit: 5, filter: { category: { eq: "blog" }}) {
    totalCount
    edges {
      node {
        id
        title
        tease
        external_url
        path
      }
    }
  }
}
</page-query>
