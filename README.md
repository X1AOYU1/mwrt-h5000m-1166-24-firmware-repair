# MWRT H5000M 1166-24 固件修复

本仓库只针对 2026-11-23 提供的 `Mwrt-h5000m-tf-1166-24-20261123.bin`，不混用旧 H5000M 固件或旧项目里的修复代码。

## 输入固件

- 设备标识：`hiveton-h5000m`
- 格式：sysupgrade tar（`CONTROL`、`kernel`、`root`）
- 大小：165,151,595 字节
- SHA-256：`438b38eb1a106f200d4892b66ab33aeae0b27ec45adbd40637de8097d9333805`
- 原始镜像可从 GitHub Release `input-2026-11-23` 下载。

## 拓扑改动

- 首页网络拓扑按有线、2.4G、5G、6G 和未知频段分组；无线频段来自连接设备的接入点数据。空频段不显示，设备离线后该线路自动消失；无在线设备时显示空状态。
- 点拓扑设备打开原有详情页。详情头像和拓扑头像由同一矢量绘制函数生成；头像裁切在框内，彩色显示。
- 详情头像可打开品牌选择器，支持自动识别或手动选品牌。手动选择按 MAC 保存在当前浏览器的 localStorage 中；换浏览器或清除浏览器数据后需要重新选择。
- 品牌优先依据设备名称/型号识别手机品牌，不把手机的 Qualcomm 等网卡供应商当作手机品牌。只有识别到的厂商品牌会作为自动品牌显示。
- 设备信息收集器使用固件自带的 Nmap MAC 前缀库补充厂商识别；随机/本地管理 MAC 不虚报厂商。

## 构建与验证

构建脚本要求提供 SHA-256 与清单一致的原始固件，以及 `unsquashfs`、`mksquashfs`、`fwtool`：

```powershell
python tools/build.py C:\path\Mwrt-h5000m-tf-1166-24-20261123.bin
```

脚本仅替换 `usr/libexec/mwrt-clients`、`www/luci-static/resources/mwrt-topo.js`、`usr/bin/footer.htm` 和 `www/luci-static/resources/view/system/flash.js`，保持 squashfs 的 POSIX 元数据、kernel、CONTROL 和固件兼容性元数据，并检查重打包结果。这份 Windows 构建不保留原签名，设备端是否接受以及无线驱动上的最终行为仍须在 H5000M 实机验证；不要绕过设备的签名或升级保护。

拓扑交互回归测试使用 Playwright 和无头 Chromium：

```powershell
node tools/topology-test.cjs
node tools/brand-logos-test.cjs
```

测试覆盖桌面和窄屏、频段分组/迁移、详情头像与品牌同步、自动识别恢复、设备列表和空列表。硬件测试尚未完成。

## 发布

新版重建镜像的目标 GitHub Release 为 `topology-2026-11-23-v5`，保留 v1/v2，附带 SHA-256 校验文件。升级前请核对设备型号、目标分区和当前固件的升级要求。

## v2 设备名称和品牌图标

- 有线设备名称优先使用有效 DHCP 租约主机名、静态 DHCP 名称和 hosts 名称；取不到时显示设备类型，厂商独立展示。
- 品牌目录包含 98 项，其中 78 项内置 SVG Logo，其余使用文字标识，未识别设备保留类型图标。
- 2026-11-23 核对 npm 最新 Simple Icons 为 16.38.1；每项来源记录在 `assets/brand-logos/sources.json`。这不表示已逐一确认全部品牌的最新改版日期。
- 使用品牌原色；Apple、索尼、荣耀等单色标志保留单色。华为使用官网红色渐变花瓣加 HUAWEI 字标，Google 使用官方彩色字标，夏普使用官方电子品牌字标，避免误用同名软件图标。
- 头像背景透明，保留圆角边框；原头像框保持 56×56，Logo 在 38×38 内等比例居中（Apple 做轻微视觉重心校正），SVG 以独立图片文档内嵌，防止样式或 ID 影响其他图标；不依赖外网加载。
- 刷写页面的默认后台地址修正为 192.168.88.1；这是提示地址修正，不覆盖用户 LAN 配置。
- 所有品牌商标归各自权利人所有；保留来源库许可及声明。

## v3 自动品牌识别

- 自动识别依次检查设备名称、型号、device、hostname、manufacturer 和 product；这些补充字段只有数据源提供时才使用，当前固件收集器主要提供 DHCP/静态配置名称和 MAC 厂商。
- 名称无法识别时，使用真实全局 MAC 对应的厂商信息；手机保留 Apple、三星等整机厂商识别，过滤 Qualcomm、MediaTek 等芯片供应商。
- 随机/本地管理 MAC 不用于推断整机厂商；仍可通过设备名称识别品牌。没有可用名称或型号时，详情显示“随机 MAC（无法判断厂商）”，可点击头像手动选择品牌。
- 保留手动品牌优先级和透明、居中、不超框的 Logo；恢复自动识别后重新按设备信息判断。
- 桌面 1440px、手机 420px 交互测试、9 组品牌识别边界用例及 78 个 SVG 加载/边界检查通过。未在 H5000M 实机上刷写验证。


## v4 Logo audit

- Replaced all 20 missing wordmark fallbacks, including Redmi and ECS/精英, with embedded colored SVG artwork.
- Added a light translucent avatar backing plate so logos remain legible on the topology canvas while staying clipped and centered inside the original frame.
- Added detailed vendor labels in the device details panel; topology cards keep short names.

## v5 按名称识别设备类型

- 设备图标分类会参考 DHCP 设备名，以及数据源提供时的友好名称、主机名、型号、设备类型、厂商和产品描述，不依赖 MAC OUI。
- 识别到名称时显示分类头像；未提供名称时保持通用联网设备图标。截图中的随机 MAC 和空设备名不足以判断具体设备，因此不能仅凭这张截图推断它是手机、电脑或其他类别。
- 测试覆盖 iPhone、MacBook、Galaxy Tab、电视、游戏机、路由器、摄像头和打印机等名称。

## 已识别厂商的头像兜底

- 已识别厂商但未匹配内置品牌 Logo 时，生成稳定配色的厂商缩写头像。例如 Wuxi Idata Technology Company 显示 WI。此类头像是识别徽标，不是厂商官方商标。
- 拓扑和详情使用相同头像，手动选择品牌及恢复自动识别时同步更新。随机 MAC 和手机芯片厂商仍遵循原有过滤规则。
- 浅色半透明底板确保标志可见，图案在原头像框内居中。
