# 部署博客实例

目标平台是 GitHub Pages。有两种部署方式：博客仓库公开时用 GitHub Actions（下面的“首次部署”），或者用 `dxbe deploy` 在本地构建后推送到网站仓库（源码可以私有）。两种方式都不提交 `dist/`。

构建系统仓库（`dxbe`）本身不部署。部署工作流放在 `templates/deploy.yml`，由博客仓库复制到 `.github/workflows/deploy.yml`。

## 首次部署

1. 创建博客仓库，安装 `dxbe` 依赖，放好 `content/`、`site.config.ts`、`public/`。免费计划下仓库必须是 public。
2. 把 `templates/deploy.yml` 复制到博客仓库的 `.github/workflows/deploy.yml`。
3. 打开 Settings → Pages → Build and deployment → Source，选择 **GitHub Actions**。
4. 推送一次提交，或在 Actions 里手动运行 **Deploy**。
5. 部署完成后打开 `https://<user>.github.io/<repo>/`。

`deploy.yml` 的流程：

```
npm ci
npx --no-install dxbe check:theme
actions/configure-pages
npx --no-install dxbe build   # 注入 SITE_URL / SITE_BASE / SITE_ENV=production
npx --no-install dxbe check:links
npx --no-install dxbe check:seo
npx --no-install dxbe index   # Pagefind
actions/upload-pages-artifact
actions/deploy-pages
npx --no-install dxbe smoke
```

## 一条命令部署：dxbe deploy

和 `hexo deploy` 一样：在本地构建，再把 `dist/` 推到一个专门放网站的仓库或分支。不需要 GitHub Actions，博客源码仓库可以是私有的（加密文章需要这样，见 [authoring.md](authoring.md#加密文章)）。

1. 在 GitHub 新建一个公开仓库放网站。用 `<user>.github.io` 作为仓库名，网址就是 `https://<user>.github.io/`。
2. 在 `site.config.ts` 里加部署目标：

   ```ts
   site: {
     url: 'https://<user>.github.io',
     base: '/',
   },
   deploy: {
     repo: 'git@github.com:<user>/<user>.github.io.git',
     branch: 'main',
   },
   ```

   `branch` 默认是 `gh-pages`；`message` 可选，默认 `Site updated: {date}`。
3. 运行：

   ```bash
   npx dxbe deploy
   ```

   它会以生产模式构建，跑链接和 SEO 检查，建搜索索引，然后把 `dist/` 提交到 `.deploy-git/`（目标分支的本地副本），再普通推送（不强推，保留网站分支的历史）。输出没有变化时不会提交。
4. 第一次部署后，在网站仓库的 Settings → Pages → Build and deployment 里选择 **Deploy from a branch**，分支选上面配置的 `branch`，目录选 `/ (root)`。

注意：

- 推送用的是本机的 git 和凭据，需要能 `git push` 到网站仓库。
- 没有 `actions/configure-pages`，不会自动注入地址。网站在子路径（例如推到 `blog` 仓库的 `gh-pages`，网址是 `https://<user>.github.io/blog/`）时，要自己写 `site.base: '/blog/'`。
- 目标分支里如果有 `site.config.ts`，说明它是源码分支，`dxbe deploy` 会拒绝推送，避免用构建结果覆盖源码。
- `npx dxbe deploy --dry-run` 只构建并在 `.deploy-git/` 里提交，不推送；`--skip-build` 跳过构建和检查，直接发布现有的 `dist/`。
- 用了 `dxbe deploy` 就不需要 `.github/workflows/deploy.yml`，两种方式选一种。

## 项目页与用户页

- 用户页/组织页：仓库名是 `<user>.github.io`，站点根是 `/`。
- 项目页：站点根是 `/<repo>/`。`actions/configure-pages` 提供 `origin` 和 `base_path`，工作流注入 `SITE_URL` / `SITE_BASE`。
- 本地模拟项目页：

```bash
npx dxbe build --base=/my-blog/
npx dxbe preview --base=/my-blog/
```

Windows Git Bash 会把 `/my-blog/` 当成路径转换。加 `MSYS_NO_PATHCONV=1`：

```bash
MSYS_NO_PATHCONV=1 npx dxbe build --base=/my-blog/
MSYS_NO_PATHCONV=1 npx dxbe preview --base=/my-blog/
```

如果资源 404，先检查 `base`。站点里所有内部 URL 都应该经过 helper，主题不应手写 `/assets/...`。

## 自定义域名

1. 在 `site.config.ts` 设置：

```ts
site: {
  url: 'https://blog.example.com',
  base: '/',
  customDomain: 'blog.example.com',
}
```

2. 构建会生成 `dist/CNAME`。
3. 在仓库 Settings → Pages → Custom domain 填写 `blog.example.com`。
4. DNS：子域名 CNAME 到 `<user>.github.io`；根域名使用 GitHub Pages 的 A/AAAA 记录。
5. 等待 DNS 检查通过，开启 Enforce HTTPS。证书签发可能需要一段时间。

不要把 `www` 和非 `www` 同时作为 canonical；选一个，另一个做跳转或只做 DNS 重定向。

## 发布产物要求

- `dist/index.html`
- `dist/404.html`
- `dist/.nojekyll`
- `dist/sitemap.xml`
- `dist/robots.txt`
- `dist/atom.xml` 和 `dist/en/atom.xml`
- `dist/pagefind/pagefind.js`

`.nojekyll` 必须存在，否则下划线开头的文件会被 Jekyll 忽略。构建和 `copyPublicAssets` 会保证它存在。

## GitHub Pages 限制

- 站点大小 1 GB，带宽 100 GB/月，构建频率 10 次/小时的软限制。
- 没有服务端重定向、没有自定义响应头、没有动态路由。
- URL 大小写敏感，slug 和资源名统一小写。
- HTML 有 CDN 缓存，发布后可能有约 10 分钟延迟；资源用内容哈希避开旧缓存。
- 私有仓库的 Pages 需要付费计划。
- Pages 不支持 PR 预览；预览用 `npx dxbe preview`。

## 回滚

- 每次部署对应一个 commit，Pages 保留部署历史。
- 在 Actions 里重新运行旧 commit 的 **Deploy**，或使用 Pages 的部署历史回滚。
- 重要版本打 tag，回滚时从 tag 触发 `workflow_dispatch`。
- smoke test 失败时不要继续发布。

## 常见故障

**首页 200，但 CSS/JS 404**

`base` 不对。项目页需要 `/repo/`；确认 CI 注入了 `SITE_BASE`，或本地用 `--base`。

**搜索页没有结果**

Pagefind 索引没有生成。部署流程必须执行 `npx dxbe index`；检查 `dist/pagefind/pagefind.js` 是否存在。

**中文标签页 404**

标签 URL 是百分号编码，输出目录是 Unicode。检查 `scripts/check-links.ts` 是否通过。不要在标签名里使用 `/` 或文件系统保留字符。

**自定义域名证书一直未签发**

DNS 还没生效，或域名被其他 Pages 站点占用。先确认 CNAME/A 记录，再等待重新签发。

**仓库改名后旧链接失效**

项目页的 base 变了。绑定自定义域名，或保留旧路径的静态重定向页。

**Pages Source 还是 "Deploy from a branch"**

改成 **GitHub Actions**。`deploy-pages` 需要这个设置，且工作流需要 `pages: write` 和 `id-token: write`。

## 升级 dxbe

换新版本、检查和常见问题见 [releasing.md](releasing.md#博客仓库升级-dxbe)。
