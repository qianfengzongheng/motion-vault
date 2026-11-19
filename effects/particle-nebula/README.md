# 星云旋转

星尘沿螺旋臂绕亮核旋转，内圈比外圈转得快。浅底搭配石墨色星尘，可选「三旋星云」和「双旋星云」。

保留此文件夹的 `index.js` 与上一级的 [canvas-motion.js](../canvas-motion.js)。将画布用 CSS 设置为目标尺寸，可参考 `width: 100%; height: auto; aspect-ratio: 12 / 5`。

```js
import { mountParticleNebula } from "./effects/particle-nebula/index.js";

const nebula = mountParticleNebula(document.querySelector("#nebula"), {
  density: 0.8,
  speed: 1,
  arms: 3
});

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) nebula.play();
// 组件卸载时调用 nebula.destroy()。
```

- `density` 范围为 0.25–1，表示旋臂星尘数量的比例。
- `speed` 范围为 0.2–2，单位为时间倍率。
- `arms` 支持 2–5 条旋臂。

使用 `setOptions({ arms: 4 })` 实时换参，`pause()` 暂停，`reset()` 将当前配置的动画相位归零。
