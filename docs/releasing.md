# 升级与发布

分两部分：博客仓库升级 `dxbe`，以及在引擎仓库发布新版本。

## 博客仓库升级 dxbe

1. 在 [Releases](https://github.com/dx3906999/dxbe/releases) 看新版的更新说明。0.x 阶段次版本号（0.6 → 0.7）可能有不兼容改动。
2. 换成新版本的 tarball：

   ```bash
   npm install https://github.com/dx3906999/dxbe/releases/download/v0.9.0/dxbe-0.9.0.tgz
   ```

   `package.json` 和 `package-lock.json` 都会变，两个都要提交。
3. 本地完整检查：

   ```bash
   npm run check
   ```

4. `npx dxbe dev` 看几页，没问题就推送，部署工作流会用新版构建。

升级后常见的问题：

- `site.config.ts` 按 schema 严格校验，字段改名或删除会直接报错，报错会指出字段路径。
- 博客的 `themes/` 里覆盖了内置主题时，新版新增的页面类型在覆盖版里没有布局，构建会提示 `missing layout ...; using ...`。
- `dxbe setup` 新增的项目文件不会自动出现在老博客里。重新运行 `npx dxbe setup` 可以补上：已有的脚本、`.nvmrc` 和 `.gitignore` 条目不会被覆盖，`site.config.ts` 覆盖前会询问并备份成 `site.config.ts.bak`。

tarball 依赖不会收到 Dependabot 的升级提醒；需要提醒时 watch 仓库的 Releases。

## 发布新版本

版本号规则：修 bug 升补丁号（0.6.1 → 0.6.2），加功能或有不兼容改动升次版本号（0.6 → 0.7）。

1. 从最新的 `main` 拉分支：

   ```bash
   git fetch origin
   git switch -c fix/xxx origin/main
   ```

2. 改代码，补测试。
3. 改版本号，不打 tag：

   ```bash
   npm version 0.6.2 --no-git-tag-version
   ```

4. 更新文档里的安装地址。旧版本号出现在 `README.md`（两处）、`docs/customization.md`、`templates/README.md` 和本文：

   ```bash
   grep -rn "0\.6\.1" README.md docs templates
   ```

5. 本地验证：

   ```bash
   npm run check
   npm run build:package
   npm pack --dry-run
   ```

   Git Bash 里手动设 `SITE_BASE=/` 时要加 `MSYS_NO_PATHCONV=1`，否则 `/` 会被改写成 Windows 路径。
6. 开 PR，等 Ubuntu 和 Windows 的 CI 都通过后合并到 `main`。
7. 在 `main` 的合并提交上打带说明的 tag 并推送：

   ```bash
   git fetch origin
   git tag -a v0.6.2 -m "dxbe v0.6.2" origin/main
   git push origin v0.6.2
   ```

8. tag 会触发 `.github/workflows/release.yml`：先确认 tag 与 `package.json` 版本一致，不一致直接失败；然后构建 tarball，创建 Release 并自动生成更新说明。
9. 用 README 里的新地址在空目录里走一遍新建博客的流程：

   ```bash
   npm init -y
   npm install https://github.com/dx3906999/dxbe/releases/download/v0.6.2/dxbe-0.6.2.tgz
   npx dxbe setup --yes --name Test --url https://test.github.io
   npx dxbe new "第一篇文章" --slug hello-world
   npm run check
   ```

注意：

- 先合并再打 tag。tag 打在功能分支上，发出去的包会缺 `main` 上的其他改动。
- 已经发布的 tag 不要删除重打，可能已经有人按那个地址安装过。发现问题就发下一个补丁版本。
- 版本检查失败时 Release 还没有创建，这时可以删掉 tag（`git push origin :refs/tags/v0.6.2`），在 `main` 上修好版本号后重新打。
- 其他原因（网络、Actions 故障）导致失败时，在 Actions 里手动运行 **Release**，填入已有的 tag 重跑。
