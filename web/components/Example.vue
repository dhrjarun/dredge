<script setup>
import { useData } from "vitepress";

const { params } = useData();

const title = params.value.title;
const links = {
  github: `https://github.com/dhrjarun/dredge/tree/main/examples/${params.value.name}`,
  stackblitz: `https://stackblitz.com/github/dhrjarun/dredge/tree/main/examples/${params.value.name}`,
};
</script>

<template>
  <div class="example-header">
    <h1>{{ title }}</h1>
    <div class="link-container">
      <a :href="links.github" target="_blank">GitHub</a>
      <a :href="links.stackblitz" target="_blank">StackBlitz</a>
    </div>
  </div>
</template>

<style>
.example-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.link-container {
  margin-left: 1.25rem;
  display: flex;
  gap: 8px;
}
</style>
