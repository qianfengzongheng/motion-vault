# 粒子聚形

使用 Canvas 2D 绘制漂移的方形颗粒。「聚形」预设由全幅浅色散点和右侧的深色回环组成，回环的前后段使用不同的粒径和透明度。「散场」预设只显示全幅散点。鼠标靠近时会推开局部颗粒，移开后颗粒平滑归位。适合首屏背景和内容展示。

## 最小接入

复制 `index.js` 到目标项目，通过原生 ES module 导入。用 CSS 设置画布的显示宽高，或设置宽度和宽高比。动画会根据画布大小调整分辨率和粒子数。

```html
<canvas id="particles" style="display: block; width: 100%; height: auto; aspect-ratio: 12 / 5" aria-hidden="true"></canvas>
<script type="module">
  import { mountParticleForm } from "./index.js";

  const preview = mountParticleForm(document.getElementById("particles"), {
    mode: "form",
    density: 0.7,
    speed: 1,
    pointerRadius: 95
  });

  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) preview.play();
  window.addEventListener("pagehide", event => {
    if (!event.persisted) preview.destroy();
  });
</script>
```

在组件里接入时，在卸载回调中调用 `destroy()`。用 `setOptions({ density: 0.5 })` 更新任意选项，用 `pause()` 暂停、`play()` 继续播放。`reset()` 将动画相位和指针扰动归零，选项取当前值。画布滚出视口或标签页隐藏时会暂停逐帧绘制，恢复可见后继续播放。

## 参数

| 参数 | 默认值 | 取值 |
| --- | --- | --- |
| `mode` | `"form"` | `"form"` 聚形，`"field"` 散场 |
| `density` | `0.7` | `0.15–1`，粒子数量相对于当前画布容量的比例 |
| `speed` | `1` | `0.2–2`，漂移时间倍率 |
| `pointerRadius` | `95` | `30–180` CSS 像素 |

场景滚动或缩放时可以继续用 CSS 控制画布尺寸。装饰性画布建议保留 `aria-hidden="true"`，并让正文、按钮等前景内容保持可读和可操作。
