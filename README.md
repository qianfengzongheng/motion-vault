# Motion Vault

[**在线体验 Motion Vault**](https://qianfengzongheng.github.io/motion-vault/)

Motion Vault 是可浏览、试播和复用的网页动效图鉴。目录支持按名称、标签或技术搜索，可按分类筛选，以网格展示。详情提供实时预览、预设、参数和可复制的配置。

## 留白见意，微动传神

留白让内容有呼吸的空间，克制让每一次变化都更容易被感知。Motion Vault 收录的是能用在真实界面里的动效。一次按压可以给操作一个回应，一次过渡可以交代页面之间的关系，一点微动可以把注意力引到恰当的地方。动效完成这件事，就可以停下来。

希望这里能帮你快速试到合适的动效，再按自己的界面调整节奏、幅度和时长。

## 本地预览

在仓库根目录启动静态服务，然后访问本地页面。网站使用原生 HTML、CSS 和 JavaScript，无需安装前端依赖或构建。

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

- 动效库 [http://127.0.0.1:4173/](http://127.0.0.1:4173/)
- 粒子聚形 [http://127.0.0.1:4173/?effect=particle-form](http://127.0.0.1:4173/?effect=particle-form)
- 机器可读索引 [effects.json](./effects.json)

## 查找和接入动效

先从 [effects.json](./effects.json) 的 `effects` 中按 `id`、`tags`、`useCases` 或 `technology` 选择条目，再读取该条目的 `source` 和 `docs`。相对路径均以索引所在目录为基准。`parameters` 记录类型、默认值、范围与单位，`presets` 记录可直接传给实现的选项对象。网页复制出来的 JSON 中，`id` 用于查找实现，`options` 对应用于挂载的参数。

目前收录 [粒子聚形](./effects/particle-form/README.md)、[星云旋转](./effects/particle-nebula/README.md)、[粒子瀑布](./effects/particle-waterfall/README.md)、[日夜主题涟漪](./effects/theme-ripple/README.md)、[阻尼卡片](./effects/damped-card/README.md)和[限时揭幕](./effects/timed-reveal/README.md)。每个动效有自己的演示、参数和两个预设。复用时同时复制 `dependencies` 列出的本地模块，并保留源码与模块之间的相对位置。

## 欢迎贡献

欢迎把你在真实项目里用过、好用又容易复用的动效带到这里。按钮反馈、页面过渡、加载状态、轻量的指针交互，都可以从一个具体的使用场景做起。也欢迎提交 Issue 分享案例、建议或遇到的问题，或通过 Pull Request 改进现有条目。

提交新动效时，请说明它适合用在哪里，附上可运行的演示、静态预览图和简短的接入示例。让参数有清楚的默认值，考虑键盘、触屏和减少动态效果偏好。页面卸载时，让动效及时停下来。

### 新增条目

1. 在 `effects/<id>/` 下放入独立实现、静态预览图和接入说明。预览图建议使用 12∶5 的比例。
2. 在 [effects.json](./effects.json) 添加条目。使用唯一且稳定的英文 ID，复用已有分类，填写收录日期、依赖、参数和预设。`demo` 采用 `./?effect=<id>`。
3. 导出 `mountExport` 对应的挂载函数。它接收画布和选项。设置 `previewType: "html"` 的动效接收空容器。挂载函数返回 `setOptions`、`play`、`pause`、`reset`、`destroy` 方法。卸载时清理自己的动画帧、监听器和观察器。数字参数会自动生成调参控件，构图等枚举选项可通过预设切换。

目录会读取新增条目，更新计数、搜索和分页。每页显示 12 项。目录使用静态缩略图，进入详情才加载该动效的模块。分类、搜索及页码写入 URL，支持返回和分享。
