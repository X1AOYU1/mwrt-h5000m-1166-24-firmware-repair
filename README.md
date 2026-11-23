# MWRT H5000M 1166-24 固件修复

本仓库只针对 2026-11-23 提供的 `Mwrt-h5000m-tf-1166-24-20261123.bin`，不混用旧 H5000M 固件或旧项目代码。

## 输入固件

- 设备标识：`hiveton-h5000m`
- 格式：sysupgrade tar（CONTROL、kernel、root）
- 大小：165,151,595 字节
- SHA-256：`438b38eb1a106f200d4892b66ab33aeae0b27ec45adbd40637de8097d9333805`
- 原始镜像保存在 GitHub Release `input-2026-11-23`。

## v6 官方品牌头像

- 品牌目录的 98 项均采用品牌官网、官方 CDN 或官方代码库提供的图形；Nothing 使用官网字体转换为轮廓。保留官方颜色、比例和形状，单色标志保持官方单色。
- 小米使用官网静态 Mi 标志，排除导航动画里的首页图形。JBL 使用 Harman 官方新闻页面提供的 JBL 素材。iQOO、Redmi、nubia、GIGABYTE 等均更换并复核官方素材。
- 对展示卡片或组合图进行裁切时，仅去除留白、独立说明文字或站点后缀；处理方式记录于清单。联想竖版官方字标旋转为横向显示。
- 白色标志配置深色底板，其余使用浅色底板。原头像框保持 56×56，品牌图形在 38×38 内等比例居中；Apple 保留轻微视觉重心校正。独立 SVG 图片隔离样式和 ID，不依赖联网加载。
- 拓扑、设备列表和详情头像共用同一渲染函数。详情头像可选择品牌或恢复自动识别，偏好按 MAC 保存在当前浏览器。
- 品牌未命中时使用手机、平板、电脑、电视、游戏机、路由器、摄像头、打印机等设备类型图标；移除自动生成的厂商缩写徽标，不将其冒充官方 Logo。
- 原始素材和来源清单位于 `assets/brand-logos/official/`；`sources.json` 记录嵌入结果、来源、处理说明和素材 SHA-256。官网可能按区域、产品线使用不同版本，本次使用核对日可取得的官方版本，不承诺所有品牌此后不会改版。商标归各自权利人所有。

## 保留的拓扑功能

- 首页按有线、2.4G、5G、6G 和未知频段分组，只显示有在线设备的线路。
- 点击设备进入详情；设备名称优先使用有效 DHCP 主机名、静态 DHCP 名称和 hosts 名称，不以厂商名替代设备名称。
- 品牌自动识别参考设备名称、主机名、型号及数据源提供的产品字段；无法匹配时参考全局 MAC 的厂商信息，过滤手机芯片厂商。随机 MAC 不用于推断整机品牌，但仍可按名称识别。
- 类型识别同样参考设备名称及型号等字段，不只依赖 MAC。
- 刷写页面的默认后台提示地址为 192.168.88.1，不覆盖用户 LAN 配置。

## 构建与验证

构建需要与输入清单 SHA-256 一致的原固件，以及 unsquashfs、mksquashfs、fwtool：

```powershell
python tools/build.py C:\path\Mwrt-h5000m-tf-1166-24-20261123.bin
```

仅替换以下四个文件：

- `usr/libexec/mwrt-clients`
- `www/luci-static/resources/mwrt-topo.js`
- `usr/bin/footer.htm`
- `www/luci-static/resources/view/system/flash.js`

构建保留 squashfs POSIX 元数据、kernel、CONTROL 和兼容性元数据，并核对重打包后的替换内容。Windows 重打包不保留原签名。

测试使用 Playwright 和 Chromium，依赖包需位于 NODE_PATH，浏览器路径可通过 BROWSER_PATH 指定：

```powershell
node tools/embed-official-logos.cjs
node tools/brand-logos-test.cjs
node tools/topology-test.cjs
```

测试覆盖 98 项来源清单和素材哈希、图片解码、相对底色的可见性、边界，以及 1440px/420px 页面上的品牌切换、恢复自动识别、头像同步、类型兜底、在线设备分组及空状态。生成的核对图位于 `work/logo-gallery-v6.png`。尚未在 H5000M 实机刷写验证；页面测试通过不等于无线驱动或中继已通过实机验证。

## 发布

输出文件为 `dist/Mwrt-h5000m-tf-1166-24-topology-v6.bin`，Release 为 `topology-2026-11-23-v6`，附带 SHA-256。历史版本保留。
