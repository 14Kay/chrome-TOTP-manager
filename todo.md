TOTP Authenticator Chrome Extension 需求文档
1. 项目概述
开发一个基于 Chrome Manifest V3 标准的 TOTP（二步验证）管理器。用户可以存储、查看验证码，并支持数据的导入导出。

2. 技术栈
- 核心框架: React 19 + TypeScript

- 构建工具: Vite (配置为开发 Chrome Extension)

- 样式库: Tailwind CSS + shadcn/ui

- 算法库: @14kay/totp-auth (用于生成 6 位 OTP)

- 存储: chrome.storage.local (持久化存储 Secret 和配置)

- 图标: Lucide React

3. 功能详细要求
    A. 主页 (Popup 页面)
        - 列表展示:

            - 展示每个账号的：平台名称（Issuer）、账号名（Account）、6 位动态验证码。

            - 字体: 验证码必须使用等宽字体（如 JetBrains Mono），确保倒计时刷新时字符位置固定，不产生抖动。

            - 倒计时: 每个卡片包含一个进度条（Progress Bar）或圆形进度环，展示 30s 的剩余时间。最后 5s 时颜色转为红色。

        - 交互:

            - 点击验证码自动复制到剪贴板，并弹出 shadcn 的 Toast 提示。

            - 顶部包含一个搜索框，可根据平台或账号筛选。

            - 顶部包含主题切换（Dark/Light Mode）。

            - 底部固定栏: 展示【导入】和【导出】两个主要按钮。

    B. 数据导入

        支持两种模式（通过 shadcn 的 Dialog 或 Tabs 实现）：

            1. 二维码导入:

            - 解析 otpauth://totp/... 格式的字符串。

            - (可选) 支持识别当前网页中的二维码。

            2. 手动导入:

            - 表单包含：平台名称、账号名称、密钥（Secret）。

            - 对密钥进行简单的格式校验（Base32）。

    C. 数据导出 (批量管理)

    - 进入“导出模式”后，列表变为可勾选状态（Checkbox）。

    - 支持“全选”和“反选”。

    - 点击导出后，将选中的数据生成为一个二维码供下载。

4. 工程与安全规范
    - 目录结构:

        - /src/components: 存放 UI 组件。

        - /src/hooks: 封装 useTOTP 逻辑（处理每秒心跳和状态更新）。

        - /src/lib: 存放 @14kay/totp-auth 的封装适配。

        - /src/types: 定义 Account 和 Storage 的 TS 类型。

    - Manifest V3:

        - 权限声明: storage, clipboardWrite, notifications。

        - 设置合适的 content_security_policy。

    - 空状态: 当 storage 为空时，主页需展示引导性的 Empty State 页面。