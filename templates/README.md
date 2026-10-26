# 博客部署模板

`deploy.yml` 是给博客仓库使用的 GitHub Pages 部署工作流。构建系统仓库本身不运行它，避免构建系统自己被当成博客部署。

创建博客仓库后：

1. `npm install https://github.com/dx3906999/dxbe/releases/download/v0.9.1/dxbe-0.9.1.tgz`。
2. 复制 `templates/deploy.yml` 到博客仓库的 `.github/workflows/deploy.yml`。
3. 在博客仓库 Settings → Pages → Source 选择 **GitHub Actions**。
4. 推送 `main`，或手动运行 **Deploy**。
5. 首次部署后检查 Actions 里的 smoke test。

`deploy.yml` 会从 `actions/configure-pages` 获取 `origin` 和 `base_path`，写入 `SITE_URL` / `SITE_BASE`，因此项目页和自定义域名都不需要改代码。
