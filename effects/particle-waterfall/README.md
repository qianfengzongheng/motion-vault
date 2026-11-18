# 粒子瀑布

细长水线从画布顶部加速落下，在底部过渡为飞沫、水雾和扩散的波纹。「峡谷细瀑」是默认预设，「宽幅水帘」加宽水流并增加飞沫。

保留此文件夹的 `index.js` 与上一级的 [canvas-motion.js](../canvas-motion.js)。将画布用 CSS 设置为目标尺寸，可参考 `width: 100%; height: auto; aspect-ratio: 12 / 5`。

```js
import { mountParticleWaterfall } from "./effects/particle-waterfall/index.js";

const waterfall = mountParticleWaterfall(document.querySelector("#waterfall"), {
  density: 0.8,
  speed: 1,
  width: 0.35,
  spray: 0.7
});

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) waterfall.play();
// 组件卸载时调用 waterfall.destroy()。
```

- `density` 范围为 0.25–1，表示垂落水线的数量比例。
- `speed` 范围为 0.2–2，单位为时间倍率。
- `width` 范围为 0.15–0.65，以画布宽度为基准。
- `spray` 范围为 0–1，控制飞沫数量和水雾浓度。

使用 `setOptions({ width: 0.5 })` 实时换参，`pause()` 暂停，`reset()` 将当前配置的动画相位归零。
