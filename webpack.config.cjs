require("dotenv").config();

const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const pagesDirName = "pages";
const pathToPages = path.resolve(__dirname, `src/${pagesDirName}/`);
const commonTemplate = fs.readFileSync(path.resolve(__dirname, "src/index.html"), "utf-8");

const getPageInputs = (dir, root) => {
  const entries = {};
  const dirents = fs.readdirSync(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name);

    if (dirent.isDirectory()) {
      const templatePath = path.join(fullPath, "index.ts");
      if (fs.existsSync(templatePath)) {
        const relativePath = path.relative(root, fullPath);
        entries[relativePath] = templatePath;
      }
      Object.assign(entries, getPageInputs(fullPath, root));
    }
  }

  return entries;
};

const pageInputs = getPageInputs(pathToPages, pathToPages);

module.exports = env => {
  const base = process.env.BASE_URL || "/";
  const isProd = env.mode === "production";
  const buildKey = isProd ? Number(new Date()) : 0;

  return {
    mode: env.mode || "development",
    devtool: isProd ? false : "source-map",
    entry: {
      main: "./src/main.ts", // здесь подключим основные скрипты, роутинг, например
      ...pageInputs,
    },
    experiments: {
      // работает только совместно со строкой library + scriptLoading
      outputModule: true,
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: chunkData => {
        const name = chunkData.chunk.name || "internal";
        if (name in pageInputs) return `${pagesDirName}/${name}/index.${buildKey}.js`;

        return `${name}.${buildKey}.js`;
      },
      publicPath: base,
      library: {
        // работает только совместно со строкой experiments + scriptLoading
        type: "module",
      },
      clean: true,
    },
    devServer: {
      static: {
        directory: path.join(__dirname, "dist"),
        publicPath: base,
      },
      hot: true,
      port: 8080,
      open: {
        target: [base],
        app: { name: "firefox" },
      },
      watchFiles: ["src/**/*.html"],
      historyApiFallback: { index: `${base}404.html` },
    },
    module: {
      rules: [
        {
          test: /(index|404)\.html$/i,
          loader: "html-loader",
          options: {
            sources: {
              urlFilter: (attribute, value) => {
                if (value === "./reset.css") return false;
                if (value === "./shadow-reset.css") return false;
                return true;
              },
            },
            preprocessor: content => {
              const params = { base, content };
              return commonTemplate.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
                return params[variable] || match;
              });
            },
          },
        },
        {
          test: /template\.html$/i,
          loader: "html-loader",
        },
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          resourceQuery: /raw/,
          type: "asset/source",
        },
        {
          test: /\.css$/,
          resourceQuery: { not: [/raw/] },
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: { modules: { auto: true } },
            },
          ],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: "src/images", to: "images" },
          { from: "src/reset.css", to: "reset.css" },
          { from: "src/shadow-reset.css", to: "shadow-reset.css" },
        ],
      }),
      new MiniCssExtractPlugin({
        filename: chunkData => {
          const name = chunkData.chunk.name;
          if (isProd) {
            return name === "main" ? "[name].[contenthash].css" : `${pagesDirName}/${name}/index.[contenthash].css`;
          }
          return name === "main" ? "[name].css" : `${pagesDirName}/${name}/index.css`;
        },
      }),
      new HtmlWebpackPlugin({
        filename: "index.html",
        template: "./src/index.html",
        chunks: ["main"],
        scriptLoading: "module",
      }),
      new HtmlWebpackPlugin({
        // сюда будем редиректить так же в случае динамических роутов, т.к.
        // github использует адрес этой страницы для перенаправления по умолчанию
        filename: "404.html",
        template: "404.html",
        chunks: ["main"],
        scriptLoading: "module",
      }),
      ...Object.entries(pageInputs).map(
        ([pageChunk, fullPath]) =>
          new HtmlWebpackPlugin({
            // удалим все, что идет до src
            filename: fullPath.replace(/.+?src\/(.+)/, (m, p) => p.replace(/\.(js|ts)/, ".html")),
            template: fullPath.replace(/\.(js|ts)/, ".html"),
            chunks: ["main", pageChunk],
            // работает только совместно со строкой library + experiments
            scriptLoading: "module",
          }),
      ),
    ],
    resolve: {
      extensions: [".ts", ".js"],
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
};
