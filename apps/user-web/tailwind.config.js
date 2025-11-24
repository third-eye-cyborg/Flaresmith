const baseConfig = require("@cloudmake/config/tailwind/base");

module.exports = {
  ...baseConfig,
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ]
};
