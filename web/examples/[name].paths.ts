import examples from "../examples.js";

export default {
  paths() {
    return examples.map((example) => ({
      params: { name: example.name, title: example.title },
      content: `---
editLink: false
title: ${example.title}
---

<script setup>
  import Example from '../components/Example.vue'
</script>

<Example />
`,
    }));
  },
};
