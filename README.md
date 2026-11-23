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

脚本仅替换 `usr/libexec/mwrt-clients` 和 `www/luci-static/resources/mwrt-topo.js`，保持 squashfs 的 POSIX 元数据、kernel、CONTROL 和固件兼容性元数据，并检查重打包结果。这份 Windows 构建不保留原签名，设备端是否接受以及无线驱动上的最终行为仍须在 H5000M 实机验证；不要绕过设备的签名或升级保护。

拓扑交互回归测试使用 Playwright 和无头 Chromium：

```powershell
node tools/topology-test.cjs
```

测试覆盖桌面和窄屏、频段分组/迁移、详情头像与品牌同步、自动识别恢复、设备列表和空列表。硬件测试尚未完成。

## 发布

当前重建镜像发布在 GitHub Release `topology-2026-11-23-v1`，附带 SHA-256 校验文件。升级前请核对设备型号、目标分区和当前固件的升级要求。
