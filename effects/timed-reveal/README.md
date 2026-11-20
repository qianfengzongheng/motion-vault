# 限时揭幕

在预览区域内移动鼠标，纯色幕布从四周向标题中心收成圆形，露出由右上向左下移动的照片。持续移动会延长揭幕。鼠标仍在区域内但停住时开始倒计时，时间到了自动盖回。鼠标移出则立即开始圆形盖回。盖回后再次移动即可开启。触屏点按或用键盘激活按钮也可试玩。减少动态效果开启时，点按或键盘触发会短暂展示静止图片。

在页面中放置一个有高度的空容器，例如 `width: 100%; aspect-ratio: 12 / 5`。保留本目录的实现和图片素材。

```js
import { mountTimedReveal } from "./effects/timed-reveal/index.js";

const preview = mountTimedReveal(document.querySelector("#reveal-demo"), {
  duration: 420,
  speed: 52,
  hold: 2500
});
preview.play();
// 卸载时调用 preview.destroy()。
```

- `duration` 为单次收拢或盖回的时长，范围 150–1000 毫秒。
- `speed` 为图片在横向和纵向上每秒各自移动的像素数，范围 12–120。
- `hold` 为收拢结束后，从最后一次移动到开始盖回的等待时间，范围 600–6000 毫秒。

`setOptions()` 调整的停驻时长从下一次移动或触发生效，收拢时长和漂移速度从下一轮揭幕生效。挂载时可用 `title` 和 `imageUrl` 替换标题及背景图片，图片会平铺。演示所用的照片拼贴为生成素材。
