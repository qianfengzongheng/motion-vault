# 阻尼卡片

鼠标悬停或触屏按住时，卡片向指针方向倾斜并显示径向反光，移开或松手后以弹簧回正。键盘聚焦卡片后可以按方向键试玩。启用减少动态效果时，卡片保持静止。

把容器设置为目标尺寸，例如 `width: 100%; aspect-ratio: 12 / 5`，然后挂载。

```js
import { mountDampedCard } from "./effects/damped-card/index.js";

const card = mountDampedCard(document.querySelector("#card-demo"), { angle: 8, damping: 15 });
card.play();
// 卸载时调用 card.destroy()。
```

`angle` 支持 2–12 度，`damping` 支持 10–26。用 `setOptions()` 调整手感，`reset()` 立即回正。
