import { defineConfig } from "vitepress";
import examples from "../examples";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Dredge",
  description: "Documentation site for Dredge",

  vite: {
    build: {
      rollupOptions: {
        external: ["vue/server-renderer", "vue"],
      },
    },
  },

  srcDir: "../",
  srcExclude: ["**/node_modules/**", "../packages", "../examples", "README.md"],
  rewrites: {
    "docs/guide/:page": "guide/:page",
    "docs/api/:page": "api/:page",
    "web/:page": ":page",
    "web/examples/:page": "examples/:page",
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Docs", link: "/guide/quick-start" },
      { text: "Examples", link: "/examples/in-express" },
    ],
    outline: {
      level: [2, 6],
    },

    sidebar: {
      "/": [
        {
          text: "Guide",
          items: [
            { text: "Quick Start", link: "/guide/quick-start" },
            { text: "Route and Router", link: "/guide/route-and-router" },
            {
              text: "Adapters",
              link: "/guide/adapters",
            },
            { text: "Validation", link: "/guide/validation" },
            { text: "Middleware", link: "/guide/middleware" },
            { text: "Context", link: "/guide/context" },
            { text: "Path and Params", link: "/guide/path-and-params" },
            { text: "SearchParams", link: "/guide/search-params" },
            { text: "Data", link: "/guide/data" },
          ],
        },
        {
          text: "API",
          items: [
            { text: "dredgeRoute", link: "/api/dredge-route" },
            { text: "RouteRequest", link: "/api/route-request" },
            { text: "RouteResponse", link: "/api/route-response" },
            { text: "dredgeRouter", link: "/api/dredge-router" },
            { text: "dredgeAdapters", link: "/api/adapters" },
            { text: "dredgeFetch", link: "/api/dredge-fetch" },
            { text: "ValidationError", link: "/api/validation-error" },
          ],
        },
      ],

      "/examples/": [
        {
          text: "Examples",
          // items: [{ text: "Demo", link: "/examples/demo" }],
          items: examples.map((example) => ({
            text: example.title,
            link: `/examples/${example.name}`,
          })),
        },
      ],
    },

    editLink: {
      text: "Edit this page on GitHub",
      pattern: "https://github.com/dhrjarun/dredge/edit/main/docs/:path",
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/dhrjarun/dredge" },
      {
        icon: "x",
        link: "https://x.com/dhrjarun",
      },
    ],

    footer: {
      copyright: "Copyright © 2024-present 2023 Dhiraj Arun",
    },
  },
});
