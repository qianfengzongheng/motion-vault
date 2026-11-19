# 日夜主题涟漪

点击主题按钮，旧主题向按钮中心收拢，露出新主题。切换只作用于演示区域。浏览器未提供 Web Animations API 或访客启用了减少动态效果时，按钮会直接切换主题。

把容器设置为目标尺寸，例如 `width: 100%; aspect-ratio: 12 / 5`，然后挂载。

```js
import { mountThemeRipple } from "./effects/theme-ripple/index.js";

const ripple = mountThemeRipple(document.querySelector("#theme-demo"), { duration: 560 });
ripple.play();
// 卸载时调用 ripple.destroy()。
```

`duration` 为 200–1000 毫秒，`reset()` 恢复到日间模式。
