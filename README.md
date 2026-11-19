# Motion Vault

Motion Vault 是可浏览、试播和复用的网页动效图鉴。目录支持按名称、标签或技术搜索，可按分类筛选，以网格展示。详情提供实时预览、预设、参数和可复制的配置。

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

目前收录 [粒子聚形](./effects/particle-form/README.md)、[星云旋转](./effects/particle-nebula/README.md)、[粒子瀑布](./effects/particle-waterfall/README.md)、[日夜主题涟漪](./effects/theme-ripple/README.md)和[阻尼卡片](./effects/damped-card/README.md)。每个动效有自己的演示、参数和两个预设。复用时同时复制 `dependencies` 列出的本地模块，并保留源码与模块之间的相对位置。

## 新增动效

1. 在 `effects/<id>/` 下放入独立实现、静态预览图和接入说明。预览图建议使用 12∶5 的比例。
2. 在 [effects.json](./effects.json) 添加条目。使用唯一且稳定的英文 ID，复用已有分类，填写收录日期、依赖、参数和预设。`demo` 采用 `./?effect=<id>`。
3. 导出 `mountExport` 对应的挂载函数。它接收画布和选项。设置 `previewType: "html"` 的动效接收空容器。挂载函数返回 `setOptions`、`play`、`pause`、`reset`、`destroy` 方法。卸载时清理自己的动画帧、监听器和观察器。数字参数会自动生成调参控件，构图等枚举选项可通过预设切换。

目录会读取新增条目，更新计数、搜索和分页。每页显示 12 项。目录使用静态缩略图，进入详情才加载该动效的模块。分类、搜索及页码写入 URL，支持返回和分享。
