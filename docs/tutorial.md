# 从零到上线：部署、写文章、发布

这篇教程从一个空目录开始，最后得到一个在 GitHub Pages 上运行的博客，并说明之后每次写文章、发布要做什么。每一步都可以直接复制命令。更细的字段说明分别在 [authoring.md](authoring.md)（写作）、[customization.md](customization.md)（配置）和 [deployment.md](deployment.md)（部署）。

> 文章封面（`cover`）和逐命令帮助（`dxbe help <命令>`）是 0.7.0 之后加入的；安装时把下文命令里的 `0.7.0` 换成 [Releases](https://github.com/dx3906999/dxbe/releases) 里的最新版本。

忘了某个命令怎么用时，随时可以看命令行帮助：

```bash
npx dxbe help          # 所有命令
npx dxbe new --help    # 某个命令的参数和例子
```

## 0. 准备

- Node.js 24 或更高版本（`node -v` 查看）
- git，并且能 `git push` 到自己的 GitHub 账号（SSH key 或 HTTPS 凭据都可以）
- 一个 GitHub 账号。下文用 `<user>` 代表你的用户名

## 1. 建博客仓库

```bash
mkdir my-blog
cd my-blog
git init
npm init -y
npm install https://github.com/dx3906999/dxbe/releases/download/v0.7.0/dxbe-0.7.0.tgz
npx dxbe setup
```

`setup` 会依次询问作者、中英文站点标题和描述、站点地址、主题等，回车使用默认值，之后都能在 `site.config.ts` 里改。两个问题需要想一下：

- **Site URL**：网站最终的地址，只写域名部分。用 `<user>.github.io` 仓库发布时填 `https://<user>.github.io`。还没决定可以先回车，部署前再改。
- **Theme**：`folio`、`orbital`、`scholar`、`apogee`、`capstan` 之一，可以先选一个，之后用 `npx dxbe dev --theme=apogee` 预览其他主题再决定。

`setup` 同时会：

- 在 `package.json` 里加上 `"type": "module"` 和 `dev`、`build`、`check` 等脚本
- 生成 `.nvmrc` 和 `.gitignore`（`passwords.yml`、`dist/` 等已经在里面）

现在仓库长这样：

```
my-blog/
  content/            # 还没有，写第一篇文章时生成
  site.config.ts
  package.json
  .nvmrc
  .gitignore
```

## 2. 本地预览

```bash
npx dxbe dev
```

打开 <http://localhost:4000>。改文章、配置或主题后页面会自动重建，刷新即可。草稿和未来日期的文章在开发模式下也能看到。按 `Ctrl+C` 停止。

## 3. 写第一篇文章

### 3.1 新建

```bash
npx dxbe new "你好，世界" --slug hello-world --tags 随记
```

生成 `content/zh/posts/hello-world/index.md`：

```markdown
---
title: 你好，世界
date: 2026-10-25T20:00:00+08:00
tags:
  - 随记
slug: hello-world
translationKey: hello-world
---

在这里写第一段。删掉这行占位文字。
```

中文标题必须给 `--slug`，它决定网址：`/posts/hello-world/`。slug 只能用小写字母、数字和连字符。写英文文章加 `--lang en`，它会放在 `content/en/posts/` 下，发布在 `/en/posts/...`。

### 3.2 正文

正文是普通 Markdown，另外支持：

- 表格、任务列表、脚注
- 代码块（构建时高亮）
- 公式：行内 `$E = mc^2$`，块级用 `$$ ... $$`
- `## 二级标题`、`### 三级标题` 会自动生成目录

### 3.3 图片和附件

图片放进文章自己的目录，用相对路径引用：

```
content/zh/posts/hello-world/
  index.md
  cover.jpg
  diagram.png
  paper.pdf
```

```markdown
![系统结构图](diagram.png)

![论文全文](paper.pdf)
```

单独一行的 PDF 会渲染成内嵌阅读器加下载链接。

### 3.4 封面

在 frontmatter 里加 `cover`，文章列表里会在标题旁边显示这张图，文章页顶部也会显示，分享到社交平台时用它做预览图（`og:image`）：

```yaml
---
title: 四月は君の嘘
date: 2025-03-25T20:00:00+08:00
tags: [随记]
slug: your-lie-in-april
cover: cover.jpg
coverAlt: 公生和薰的海报
---
```

- `cover: cover.jpg`：文章目录里的文件（推荐）。也可以写子目录，如 `images/cover.jpg`。
- `cover: /images/cover.jpg`：博客根目录 `public/images/cover.jpg`，适合多篇文章共用一张图。
- `cover: https://...`：外部图片地址。
- `coverAlt`：可选，文章页顶部图片的替代文字。列表里的封面是装饰，读屏软件会跳过。

找不到封面文件时构建会直接报错，不会发布一个坏图。图片建议横向、宽度 1200px 左右，列表会裁成 16:10 左右的比例，文章页最多显示约 420px 高。归档页保持紧凑，不显示封面。

加密文章同样可以有封面，封面和标题、摘要一样是公开的。

### 3.5 常用 frontmatter

| 字段 | 作用 |
| --- | --- |
| `title` | 标题（必填） |
| `date` | 发布时间，必须带时区，如 `2026-10-25T20:00:00+08:00`（必填） |
| `updated` | 修改时间，改了旧文章时加上 |
| `tags` / `categories` | 标签 / 分类，生成对应列表页 |
| `summary` | 列表里显示的摘要；不写就取正文第一段 |
| `cover` / `coverAlt` | 封面和替代文字，见上节 |
| `draft: true` | 草稿，只在 `dxbe dev` 里出现，不会发布 |
| `encrypt: diary` | 加密文章，见下节 |

完整列表见 [authoring.md](authoring.md#frontmatter)。

### 3.6 加密文章（可选）

1. frontmatter 加 `encrypt: diary`。
2. 在博客根目录建 `passwords.yml`：

   ```yaml
   diary: 一个足够长、不容易猜的密码
   ```

3. 读者打开文章时输入密码，在浏览器里解密。

`passwords.yml` 已被 `.gitignore` 忽略，不会提交。注意 Markdown 原文就是明文，**用加密文章时博客源码仓库必须私有**，并用下面的方式 A 发布。

### 3.7 页面

“关于”这类不进文章列表的页面放在 `content/zh/pages/about.md`，发布在 `/about/`。frontmatter 只需要 `title`。

## 4. 部署

有两种方式，选一种即可：

| | 方式 A：`dxbe deploy` | 方式 B：GitHub Actions |
| --- | --- | --- |
| 源码仓库 | 可以私有 | 免费账号必须公开 |
| 发布动作 | 本地运行一条命令 | `git push` 后自动构建 |
| 适合 | 有加密文章；习惯 `hexo deploy` | 想在任何地方 push 就发布 |

### 方式 A：一条命令部署

**第一次：**

1. 在 GitHub 新建一个**公开**仓库，名字是 `<user>.github.io`，什么都不用勾选。
2. 打开 `site.config.ts`，确认地址并加上部署目标：

   ```ts
   site: {
     url: 'https://<user>.github.io',
     base: '/',
     // ...其余保持不变
   },
   deploy: {
     repo: 'git@github.com:<user>/<user>.github.io.git',
     branch: 'main',
   },
   ```

   用 HTTPS 推送时把 `repo` 写成 `https://github.com/<user>/<user>.github.io.git`。

3. 先演练一次，只构建和本地提交，不推送：

   ```bash
   npx dxbe deploy --dry-run
   ```

4. 正式部署：

   ```bash
   npx dxbe deploy
   ```

   它会做生产构建、检查链接和 SEO、生成搜索索引，然后把 `dist/` 推到网站仓库。

5. 打开网站仓库的 Settings → Pages → Build and deployment，Source 选 **Deploy from a branch**，分支选 `main`、目录选 `/ (root)`，保存。
6. 一两分钟后访问 `https://<user>.github.io/`。

博客源码另外放在一个私有仓库里（例如 `<user>/blog-source`），正常 `git add`、`git commit`、`git push` 备份即可，它和网站仓库互不影响。

### 方式 B：GitHub Actions

1. 在 GitHub 新建一个**公开**仓库放博客源码，例如 `<user>/blog`。
2. 打开这个仓库的 Settings → Pages → Build and deployment，Source 选 **GitHub Actions**。
3. 下载部署工作流（它不在 npm 包里，在 dxbe 仓库的 `templates/` 下）：

   ```bash
   mkdir -p .github/workflows
   curl -fsSL -o .github/workflows/deploy.yml https://raw.githubusercontent.com/dx3906999/dxbe/v0.7.0/templates/deploy.yml
   ```

   没有 `curl` 时，在浏览器打开这个地址，把内容保存成 `.github/workflows/deploy.yml`。

4. 提交并推送：

   ```bash
   git add .
   git commit -m "first post"
   git branch -M main
   git remote add origin git@github.com:<user>/blog.git
   git push -u origin main
   ```

5. 推送会触发 Actions 里的 **Deploy**，完成后访问 `https://<user>.github.io/blog/`。仓库名就是 `<user>.github.io` 时是 `https://<user>.github.io/`。

方式 B 不需要在配置里写地址和子路径，工作流会自动注入。

### 自定义域名（可选）

`site.config.ts` 里写 `site.url: 'https://blog.example.com'` 和 `site.customDomain: 'blog.example.com'`，DNS 加一条 CNAME 指向 `<user>.github.io`，再在 Pages 设置里填域名、勾选 Enforce HTTPS。详见 [deployment.md](deployment.md#自定义域名)。

## 5. 日常：写 → 预览 → 发布

部署好以后，每篇新文章都是这几步：

```bash
# 1. 新建
npx dxbe new "文章标题" --slug my-post --tags 工程

# 2. 写作，边写边看
npx dxbe dev

# 3. 发布
npx dxbe deploy                         # 方式 A
git add . && git commit -m "post: my-post" && git push   # 方式 B
```

方式 A 的用户也记得把源码推到私有仓库备份。

发布前想看和线上完全一样的结果：

```bash
npx dxbe build --production
npx dxbe index
npx dxbe preview
```

一些常见操作：

- **先写不发**：frontmatter 写 `draft: true`，发布时会被排除；写完删掉这一行再发布。
- **定时发布**：`date` 写成未来时间的文章不会出现在生产构建里，到时间后再发布一次即可。
- **修改旧文章**：直接改，加上 `updated: <时间>`，然后照常发布。
- **删除文章**：删掉文章目录再发布。
- **换主题**：改 `site.config.ts` 的 `theme.name`，`npx dxbe dev` 看效果后发布。
- **发布前全面检查**：`npx dxbe check`，会构建并检查链接、SEO、全部主题和搜索索引。

## 6. 出错了怎么办

**`date` 报错**：时间必须带时区，写 `2026-10-25T20:00:00+08:00`，不要写 `2026-10-25`。

**`Invalid slug`**：slug 只能是小写字母、数字和单个连字符，例如 `my-first-post`。

**`Cover image "..." was not found`**：封面文件不在文章目录里，或文件名大小写不一致。文章必须是 `posts/<slug>/index.md` 这种目录形式才能放图片。

**`Refusing to build production metadata for placeholder host`**：`site.url` 还是 `localhost` 或示例域名，改成真实地址。

**`No password named "..."`**：`passwords.yml` 里没有这个名字，或文件不在博客根目录。

**页面能打开但样式丢失**：项目页（`/blog/`）用方式 A 部署时，需要自己写 `site.base: '/blog/'`。

**推送被拒绝**：确认本机能 `git push` 到网站仓库；SSH 地址需要配置好 SSH key。

**发布后看不到更新**：GitHub Pages 有几分钟缓存，稍等或强制刷新。

还有问题可以运行 `npx dxbe help <命令>` 查看参数，或查阅 [deployment.md](deployment.md#常见故障)。
