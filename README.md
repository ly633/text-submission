# 文本提交系统

独立于课程分组、成绩网页的学生文本提交网站。

- 学生入口：<https://ly633.github.io/text-submission/>
- 教师查看：<https://ly633.github.io/text-submission/?view=records>
- 原课程网站仍位于 <https://ly633.github.io/GDL/>，本项目不含分组、成绩页面或课程草稿功能。

学生填写姓名、学号及自由文本，无需 GitHub 账号。每次最多 20,000 个 UTF-16 单位，保留原始换行和前后空白。成功保存后返回回执，可下载回执与原文。同一学号的再次提交新增记录；网络中断后原页面原样重试不会重复保存。关闭或刷新页面不保留未提交内容。

教师使用原有密码登录，在在线表格中查看全文、加载更多记录、导出全部 Excel。姓名和学号由学生自填，尚未验证学生身份。提交内容只允许教师读取，不发布到 GitHub 仓库。Excel 保留学号前导零，并把用户文本写为字符串而非公式。

## 网站与后台

网页源码、构建和 GitHub Pages 部署使用本仓库，独立发布。按用户要求继续使用原教师认证和保存服务；提交表与课堂成绩分别保存。旧提交记录保留，教师密码与原系统共用。页面只使用登录、退出与提交接口，不载入或修改课程草稿及成绩。

数据库与服务位于同工作区的 `classroom-backend` 项目，使用 Cloudflare D1。单个 IP 每 10 分钟最多 300 次、每学号 10 次、全局 3,000 次。教师会话仅存于页面内存，页面刷新后重新登录。

## 开发与发布

需要 Node.js 24 或 >=22.13：

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

本地联调可在启动 Vite 前设置 `VITE_SUBMISSION_API_BASE`。生产不设置时使用现有服务。GitHub Pages Source 选择 GitHub Actions，推送 `main` 后执行测试、构建和发布。输出目录为 `dist/`，支持 GitHub Pages 子路径。
